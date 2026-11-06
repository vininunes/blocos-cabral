// Processo main do app instalável (Relatório Blocos Cabral). Mesmo desenho do
// demonstration-media/editor: a janela carrega um servidor HTTP interno em 127.0.0.1 —
// protegido por um token de sessão em cookie — que serve o build da web e a mesma API
// do `yarn dev` (server/relatorio-api.ts).
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'

import { createRelatorioApi, dataDirs, RELATORIO_ACCESS_COOKIE } from '../server/relatorio-api'

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL // definido por scripts/electron-dev.mjs
const APP_NAME = 'Relatorio Blocos Cabral'
const SMOKE_TEST = process.env.RELATORIO_SMOKE_TEST === '1'
/** Mesma cor do header (--background do solid-theme claro). */
const HEADER_COLOR = '#ffffff'
const HEADER_HEIGHT = 56
/** Botões da janela no macOS, centralizados no header (ver MAC_BOTOES_JANELA em src/config/desktop.ts). */
const BOTOES_JANELA = { x: 18, y: (HEADER_HEIGHT - 16) / 2 }

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

/** entrada/, dados/, saida/: na pasta Documentos, fácil de achar e de fazer backup. */
function dataRoot() {
  if (process.env.RELATORIO_DATA_DIR) return process.env.RELATORIO_DATA_DIR
  // electron:dev usa os dados do projeto, como o `yarn dev`
  if (!app.isPackaged) return path.resolve(app.getAppPath(), '..')
  return path.join(app.getPath('documents'), APP_NAME)
}

// ---------------------------------------------------------------------------
// Servidor interno: build da web + API local
// ---------------------------------------------------------------------------
/** Onde o app antigo (Python) guardava a base: migrada no primeiro uso. */
function basesAntigas() {
  const caminhos = [path.join(dataRoot(), 'dados', 'base.xlsx')]
  if (process.platform === 'win32' && process.env.LOCALAPPDATA)
    caminhos.push(
      path.join(process.env.LOCALAPPDATA, 'RelatorioBlocosCabral', 'dados', 'base.xlsx')
    )
  if (process.platform === 'darwin')
    caminhos.push(path.join(app.getPath('home'), 'Desktop', 'blocos-cabral', 'dados', 'base.xlsx'))
  return caminhos
}

let api: ReturnType<typeof createRelatorioApi> | null = null

async function startServer() {
  const accessToken = randomBytes(24).toString('hex')
  api = createRelatorioApi({
    dataRoot: dataRoot(),
    basesAntigas: basesAntigas(),
    accessToken,
    version: app.getVersion(),
    abrirArquivo: (caminho, mostrar) =>
      mostrar ? shell.showItemInFolder(caminho) : void shell.openPath(caminho),
  })
  const webDist = path.join(app.getAppPath(), 'dist')

  const server = http.createServer(async (req, res) => {
    if (await api!.handle(req, res)) return
    // estáticos do build com fallback para index.html (SPA)
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    const resolved = path.normalize(path.join(webDist, pathname))
    if (!resolved.startsWith(webDist)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }
    const file =
      fs.existsSync(resolved) && fs.statSync(resolved).isFile()
        ? resolved
        : path.extname(pathname)
          ? null
          : path.join(webDist, 'index.html')
    if (!file) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
    fs.createReadStream(file).pipe(res)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  await session.defaultSession.cookies.set({
    url: origin,
    name: RELATORIO_ACCESS_COOKIE,
    value: accessToken,
    httpOnly: true,
    sameSite: 'strict',
  })
  app.on('before-quit', () => {
    api?.shutdown()
    server.close()
  })
  return origin
}

// ---------------------------------------------------------------------------
// Janela
// ---------------------------------------------------------------------------
function applyNavigationPolicy(win: BrowserWindow, origin: string) {
  const internal = (url: string) => {
    try {
      return new URL(url).origin === origin
    } catch {
      return false
    }
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!internal(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (internal(url)) return
    event.preventDefault()
    void shell.openExternal(url)
  })
}

// Botões da janela desenhados pelo header no Windows/Linux (sem a barra de título nativa).
ipcMain.on('janela:minimizar', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('janela:maximizar', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.on('janela:fechar', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.handle(
  'janela:estaMaximizada',
  (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
)

function createWindow(origin: string) {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: HEADER_COLOR,
    show: false,
    // barra de título contínua com o header: no macOS os botões nativos da janela ficam sobre
    // ele; no Windows/Linux o próprio header desenha minimizar/maximizar/fechar (ver
    // BotoesJanelaWindows), porque o overlay nativo tem hover quase invisível sobre o branco
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: BOTOES_JANELA } : {}),
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  applyNavigationPolicy(win, origin)
  // estado de maximizada para o header trocar o ícone de maximizar/restaurar
  const avisarMaximizada = () => win.webContents.send('janela:maximizada', win.isMaximized())
  win.on('maximize', avisarMaximizada)
  win.on('unmaximize', avisarMaximizada)
  win.once('ready-to-show', () => win.show())
  if (process.platform === 'darwin') {
    // sem foco, o macOS deixa os botões da janela quase brancos sobre o header branco: some
    // com os nativos e o header desenha três círculos cinza no mesmo lugar (BotoesJanelaInativa)
    win.on('blur', () => win.setWindowButtonVisibility(false))
    win.on('focus', () => {
      win.setWindowButtonVisibility(true)
      // mostrar de novo volta os botões para a posição padrão do macOS: reaplica a do header
      // (agora e no próximo ciclo, depois que o AppKit refaz o layout da barra de título)
      win.setWindowButtonPosition(BOTOES_JANELA)
      setTimeout(() => !win.isDestroyed() && win.setWindowButtonPosition(BOTOES_JANELA), 0)
    })
  }
  void win.loadURL(`${origin}/`)
  if (DEV_SERVER_URL) win.webContents.openDevTools({ mode: 'detach' })
  attachDiagnostics(win)
  return win
}

// RELATORIO_SMOKE_TEST=1: loga o carregamento, consulta a API e encerra sozinho.
function attachDiagnostics(win: BrowserWindow) {
  const wc = win.webContents
  wc.on('did-fail-load', (_e, code, desc, url) =>
    console.error(`[relatorio] did-fail-load ${code} ${desc} ${url}`)
  )
  wc.on('render-process-gone', (_e, details) =>
    console.error(`[relatorio] render-process-gone ${details.reason}`)
  )
  if (!SMOKE_TEST) return
  wc.on('console-message', (event) =>
    console.log(`[smoke][renderer:${event.level}] ${event.message}`)
  )
  wc.on('did-finish-load', () => console.log(`[smoke] did-finish-load ${wc.getURL()}`))
  setTimeout(
    async () => {
      try {
        // RELATORIO_SMOKE_IMPORT=1: importa a pasta entrada/ (CSV + PDF) pelo servidor interno
        if (process.env.RELATORIO_SMOKE_IMPORT === '1') {
          const r = await wc.executeJavaScript(
            `fetch('/api/importacao/pasta', { method: 'POST' }).then((r) => r.json()).then(JSON.stringify)`
          )
          console.log(`[smoke] importacao ${r}`)
          const consulta = JSON.stringify({
            tipo: 'Semana',
            ancora: '2026-10-16',
            modo: 'Até a mesma data',
            filtro: 'Todos',
          })
          for (const tipo of ['ppt', 'excel', 'base']) {
            const e = await wc.executeJavaScript(
              `fetch('/api/exportar/${tipo}', { method: 'POST', body: ${JSON.stringify(consulta)} }).then((r) => r.json()).then(JSON.stringify)`
            )
            console.log(`[smoke] exportar ${tipo} ${e}`)
          }
          wc.reload()
          await new Promise((resolve) => setTimeout(resolve, 4000))
        }
        const state = await wc.executeJavaScript(`(async () => JSON.stringify({
          title: document.title,
          rootChildren: document.getElementById('root')?.children.length ?? -1,
          health: await fetch('/api/health').then((r) => r.json()),
          base: await fetch('/api/base').then((r) => r.json()).then((b) => ({ vazia: b.vazia, cobertura: b.cobertura, migracao: b.migracao })),
          desktop: window.relatorioDesktop ?? null,
        }))()`)
        console.log(`[smoke] state ${state}`)
        if (process.env.RELATORIO_SMOKE_SHOT) {
          const image = await wc.capturePage()
          fs.writeFileSync(process.env.RELATORIO_SMOKE_SHOT, image.toPNG())
        }
      } catch (error) {
        console.error(`[smoke] executeJavaScript falhou: ${error}`)
      }
      app.quit()
    },
    Number(process.env.RELATORIO_SMOKE_TEST_MS ?? 6000)
  )
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const dirs = dataDirs(dataRoot())
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: 'appMenu' as const }] : []),
      { role: 'fileMenu' },
      { role: 'editMenu' },
      {
        label: 'Exibir',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Dados',
        submenu: [
          { label: 'Abrir pasta de dados', click: () => void shell.openPath(dataRoot()) },
          { label: 'Abrir arquivos importados', click: () => void shell.openPath(dirs.entrada) },
          { label: 'Abrir relatórios gerados', click: () => void shell.openPath(dirs.saida) },
          { type: 'separator' },
          {
            label: 'Importar base do app antigo (base.xlsx)…',
            click: () => void importarBaseAntiga(),
          },
        ],
      },
      { role: 'windowMenu' },
    ])
  )
}

/** Menu Dados: escolhe a base.xlsx do app antigo e substitui a base atual por ela. */
async function importarBaseAntiga() {
  const win = BrowserWindow.getAllWindows()[0]
  if (!api || !win) {
    dialog.showErrorBox(
      APP_NAME,
      'Disponível no app instalado (no yarn dev a base antiga é migrada sozinha).'
    )
    return
  }
  const escolha = await dialog.showOpenDialog(win, {
    title: 'Base do app antigo',
    defaultPath: basesAntigas().find((c) => fs.existsSync(c)),
    filters: [{ name: 'Planilha', extensions: ['xlsx'] }],
    properties: ['openFile'],
  })
  if (escolha.canceled || !escolha.filePaths[0]) return
  const ok = dialog.showMessageBoxSync(win, {
    type: 'warning',
    message: 'Substituir a base atual pela base do app antigo?',
    detail:
      'Propostas, pedidos, notas e o feedback atuais serão trocados pelo conteúdo da planilha escolhida.',
    buttons: ['Cancelar', 'Substituir'],
    defaultId: 0,
    cancelId: 0,
  })
  if (ok !== 1) return
  try {
    const r = await api.migrar(escolha.filePaths[0])
    dialog.showMessageBoxSync(win, {
      type: 'info',
      message: 'Base importada',
      detail: `${r.propostas} propostas (${r.comFeedback} com feedback), ${r.pedidos} pedidos e ${r.notas} notas.`,
    })
    win.webContents.reload()
  } catch (e) {
    dialog.showErrorBox(
      APP_NAME,
      `Não foi possível ler a planilha: ${e instanceof Error ? e.message : e}`
    )
  }
}

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setName(APP_NAME)
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  void app.whenReady().then(async () => {
    buildMenu()
    // electron:dev roda o binário do Electron: sem isto o Dock mostra o ícone dele
    if (!app.isPackaged && process.platform === 'darwin')
      app.dock?.setIcon(path.join(app.getAppPath(), 'build', 'icon.png'))
    // dev (electron:dev): o Vite já serve a web + API; empacotado: servidor interno
    const origin = DEV_SERVER_URL ? new URL(DEV_SERVER_URL).origin : await startServer()
    createWindow(origin)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(origin)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

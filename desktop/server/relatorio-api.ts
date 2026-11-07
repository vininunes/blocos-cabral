// API local do relatório. Roda dentro do dev server do Vite (yarn dev) e, no app
// instalado, dentro do processo main do Electron (electron/main.ts) — o mesmo handler.
//
//   GET  /api/health                versão e pastas de dados
//   GET  /api/base                  cobertura da base, fontes e última importação
//   POST /api/relatorio             relatório do período/comparação/status (ConsultaRelatorio)
//   POST /api/importacao            importa arquivos enviados (base64) e grava cópia em entrada/
//   POST /api/importacao/pasta      importa os arquivos novos de entrada/
//   POST /api/importacao/verificar  { nome, conteudo } -> tipo identificado e nome com que já foi importado
//   PUT  /api/feedback              grava motivo/comentário/datas/pedido editados
//   POST /api/exportar/ppt|excel    gera o PowerPoint/Excel do relatório em saida/ (ConsultaRelatorio)
//   POST /api/exportar/carteira     carteira em processo (clientes e propostas) em .xlsx
//   POST /api/exportar/base         exporta a base inteira em .xlsx para saida/
//   GET  /api/banco                 cobertura dia a dia por fonte e tamanho das tabelas
//   GET  /api/banco/tabela/:nome    conteúdo de uma tabela (propostas, itensPropostas, pedidos, notas, arquivos)
//   GET  /api/banco/clientes        clientes com indicadores e a curva ABC
//   PUT  /api/banco/clientes        grava grupo/segmento/situação/observações
//   DELETE /api/banco/arquivos/:hash desfaz a importação de um arquivo (refaz a base sem ele)
//   GET  /api/banco/provisoes/:cliente  provisão do cliente (total R$ por mês)
//   PUT  /api/banco/provisoes/:cliente  troca os 12 meses de um ano da provisão do cliente
//   POST /api/banco/provisoes-lote      meses preenchidos da provisão para vários clientes
//   GET  /api/saida/:nome           baixa um arquivo de saida/
//   POST /api/saida/:nome/abrir     abre o arquivo no programa padrão (?mostrar=1: mostra na pasta)
import type { Plugin } from 'vite'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

import type {
  ConsultaRelatorio,
  PedidoClientes,
  PedidoFeedback,
  PedidoImportacao,
  PedidoProvisaoLote,
  PedidoProvisoes,
  TabelaBanco,
} from './relatorio/api-tipos'
import { criarServico } from './relatorio/servico'

export const RELATORIO_ACCESS_COOKIE = 'rbc_access'

export type RelatorioApiOptions = {
  /** Pasta com entrada/ (exports do Bling), dados/ (base) e saida/ (PPT/Excel). */
  dataRoot: string
  /** App instalado: exige o cookie de sessão definido pelo Electron. */
  accessToken?: string
  version?: string
  /** base.xlsx do app antigo (Python): a 1ª que existir é migrada quando ainda não há base.json. */
  basesAntigas?: string[]
  /** Abre um arquivo (ou mostra na pasta). No Electron: shell; no `yarn dev`: comando do sistema. */
  abrirArquivo?: (caminho: string, mostrarNaPasta: boolean) => void
}

/** Abrir arquivo sem Electron (yarn dev): open (macOS), explorer (Windows), xdg-open (Linux). */
export function abrirComSistema(caminho: string, mostrarNaPasta: boolean) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', mostrarNaPasta ? ['-R', caminho] : [caminho]]
      : process.platform === 'win32'
        ? ['explorer', mostrarNaPasta ? [`/select,${caminho}`] : [caminho]]
        : ['xdg-open', [mostrarNaPasta ? path.dirname(caminho) : caminho]]
  spawn(cmd, args as string[], { detached: true, stdio: 'ignore' }).unref()
}

const MIME_SAIDA: Record<string, string> = {
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export function dataDirs(dataRoot: string) {
  return {
    entrada: path.join(dataRoot, 'entrada'),
    dados: path.join(dataRoot, 'dados'),
    saida: path.join(dataRoot, 'saida'),
  }
}

export function createRelatorioApi(options: RelatorioApiOptions) {
  const dirs = dataDirs(options.dataRoot)
  for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true })
  const servico = criarServico(dirs, { basesAntigas: options.basesAntigas })
  // importação/feedback alteram a base: uma de cada vez
  let trabalho: string | null = null
  async function exclusivo<T>(nome: string, fn: () => Promise<T> | T): Promise<T> {
    if (trabalho) throw new HttpError(409, `Aguarde: ${trabalho.toLowerCase()} em andamento.`)
    trabalho = nome
    try {
      return await fn()
    } finally {
      trabalho = null
    }
  }
  const json = async <T>(req: IncomingMessage) =>
    JSON.parse((await readBody(req)).toString('utf-8') || '{}') as T

  async function route(req: IncomingMessage, res: ServerResponse, url: URL) {
    const rota = `${req.method} ${url.pathname}`
    switch (rota) {
      case 'GET /api/health':
        return sendJson(res, 200, {
          ok: true,
          version: options.version ?? 'dev',
          dataRoot: options.dataRoot,
          dirs,
        })
      case 'GET /api/base':
        return sendJson(res, 200, servico.estado())
      case 'POST /api/relatorio':
        return sendJson(res, 200, servico.relatorio(await json<ConsultaRelatorio>(req)))
      case 'POST /api/importacao': {
        const pedido = await json<PedidoImportacao>(req)
        return sendJson(res, 200, await exclusivo('Importação', () => servico.importar(pedido)))
      }
      case 'POST /api/importacao/pasta':
        return sendJson(res, 200, await exclusivo('Importação', () => servico.importarPasta()))
      case 'POST /api/importacao/verificar': {
        const { nome, conteudo } = await json<{ nome: string; conteudo: string }>(req)
        return sendJson(res, 200, servico.verificarArquivo(nome ?? '', conteudo))
      }
      case 'PUT /api/feedback': {
        const pedido = await json<PedidoFeedback>(req)
        return sendJson(
          res,
          200,
          await exclusivo('Gravação do feedback', () => servico.salvarFeedback(pedido))
        )
      }
      case 'POST /api/exportar/ppt':
      case 'POST /api/exportar/excel': {
        const consulta = await json<ConsultaRelatorio>(req)
        const tipo = url.pathname.endsWith('ppt') ? 'ppt' : 'excel'
        return sendJson(
          res,
          200,
          await exclusivo('Geração do arquivo', () => servico.exportar(tipo, consulta))
        )
      }
      case 'GET /api/banco':
        return sendJson(res, 200, servico.estadoBanco())
      case 'GET /api/banco/clientes':
        return sendJson(res, 200, servico.clientes())
      case 'PUT /api/banco/clientes': {
        const pedido = await json<PedidoClientes>(req)
        await exclusivo('Gravação dos clientes', () => servico.salvarClientes(pedido))
        return sendJson(res, 200, { ok: true })
      }
      case 'POST /api/banco/provisoes-lote': {
        const pedido = await json<PedidoProvisaoLote>(req)
        return sendJson(
          res,
          200,
          await exclusivo('Gravação da provisão', () => servico.lancarProvisaoEmLote(pedido))
        )
      }
      case 'POST /api/exportar/carteira': {
        const consulta = await json<ConsultaRelatorio>(req)
        return sendJson(
          res,
          200,
          await exclusivo('Geração do arquivo', () => servico.exportarCarteira(consulta))
        )
      }
      case 'POST /api/exportar/base':
        return sendJson(
          res,
          200,
          await exclusivo('Exportação da base', () => servico.exportarBase())
        )
    }
    const tabela = /^\/api\/banco\/tabela\/([A-Za-z]+)$/.exec(url.pathname)
    if (tabela && req.method === 'GET')
      return sendJson(res, 200, servico.tabelaBanco(tabela[1] as TabelaBanco))
    const prov = /^\/api\/banco\/provisoes\/(.+)$/.exec(url.pathname)
    if (prov) {
      const cliente = decodeURIComponent(prov[1])
      if (req.method === 'GET') return sendJson(res, 200, servico.provisoes(cliente))
      if (req.method === 'PUT') {
        const pedido = await json<PedidoProvisoes>(req)
        return sendJson(
          res,
          200,
          await exclusivo('Gravação da provisão', () => servico.salvarProvisoes(cliente, pedido))
        )
      }
    }
    const arquivo = /^\/api\/banco\/arquivos\/([0-9a-f]+)$/.exec(url.pathname)
    if (arquivo && req.method === 'DELETE')
      return sendJson(
        res,
        200,
        await exclusivo('Desfazer importação', () => servico.desfazerImportacao(arquivo[1]))
      )
    const saida = /^\/api\/saida\/([^/]+)(\/abrir)?$/.exec(url.pathname)
    if (saida) {
      const caminho = servico.arquivoDeSaida(decodeURIComponent(saida[1]))
      if (!caminho) throw new HttpError(404, 'Arquivo não encontrado em saida/')
      if (saida[2] && req.method === 'POST') {
        ;(options.abrirArquivo ?? abrirComSistema)(caminho, url.searchParams.get('mostrar') === '1')
        return sendJson(res, 200, { ok: true })
      }
      if (req.method === 'GET') {
        const nome = path.basename(caminho)
        res.statusCode = 200
        res.setHeader('Content-Type', MIME_SAIDA[path.extname(nome)] ?? 'application/octet-stream')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`
        )
        fs.createReadStream(caminho).pipe(res)
        return
      }
    }
    throw new HttpError(404, 'Rota não encontrada')
  }

  function authorized(req: IncomingMessage) {
    if (!options.accessToken) return true
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? '').split(';').map((part) => {
        const [key, ...value] = part.trim().split('=')
        return [key, value.join('=')]
      })
    )
    return cookies[RELATORIO_ACCESS_COOKIE] === options.accessToken
  }

  /** Atende /api; devolve false para o resto (estáticos do app). */
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return false
    if (!authorized(req)) {
      sendJson(res, 403, { message: 'Acesso negado' })
      return true
    }
    try {
      await servico.pronto // migração da base antiga no primeiro uso
      await route(req, res, url)
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      if (status === 500) console.error('[relatorio-api]', error)
      sendJson(res, status, { message: error instanceof Error ? error.message : String(error) })
    }
    return true
  }

  return {
    handle,
    /** Trabalho em andamento que não deve ser interrompido ao fechar (null = nenhum). */
    busy: (): string | null => trabalho,
    /** Menu Dados → Importar base do app antigo. */
    migrar: (caminhoXlsx: string) =>
      exclusivo('Migração da base', () => servico.migrar(caminhoXlsx)),
    shutdown: () => {},
  }
}

/** Plugin do Vite: a mesma API no `yarn dev`, com os dados na raiz do projeto. */
export function relatorioApi({ dataRoot }: { dataRoot: string }): Plugin {
  return {
    name: 'relatorio-api',
    configureServer(server) {
      const api = createRelatorioApi({
        dataRoot,
        basesAntigas: [path.join(dataRoot, 'dados', 'base.xlsx')],
      })
      server.middlewares.use(async (req, res, next) => {
        if (!(await api.handle(req, res))) next()
      })
      server.httpServer?.on('close', api.shutdown)
    },
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

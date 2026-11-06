// Sobe o Vite do app (com a API local) e abre o Electron apontando para ele —
// hot reload da web. Mudanças em electron/ exigem reiniciar o comando.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.VITE_PORT ?? 3200)
const DEV_SERVER_URL = `http://localhost:${PORT}`
const bin = (name) =>
  path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)

const children = []
function run(cmd, args, opts) {
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: root, ...opts })
  children.push(child)
  return child
}
function shutdown(code = 0) {
  for (const child of children) if (!child.killed) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

async function waitForServer(url, timeoutMs = 120_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`O Vite não respondeu em ${url} em ${timeoutMs / 1000}s`)
}

run(bin('vite'), ['--port', String(PORT), '--strictPort']).on('exit', (code) => shutdown(code ?? 0))
try {
  await waitForServer(DEV_SERVER_URL)
} catch (error) {
  console.error(error.message)
  shutdown(1)
}
run(process.execPath, ['scripts/build-electron.mjs']).on('exit', (code) => {
  if (code !== 0) return shutdown(code ?? 1)
  run(bin('electron'), ['.'], { env: { ...process.env, VITE_DEV_SERVER_URL: DEV_SERVER_URL } }).on(
    'exit',
    (electronCode) => shutdown(electronCode ?? 0)
  )
})

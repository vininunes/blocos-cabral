// Empacota electron/main.ts (+ server/: leitores, base, métricas, PPT, Excel) num único ESM para o
// Electron.

import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [path.join(root, 'electron/main.ts')],
  outfile: path.join(root, 'dist-electron/main.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  // @napi-rs/canvas: opcional do pdf.js (só para desenhar páginas); nativo, fica de fora
  external: ['electron', 'vite', '@napi-rs/canvas'],
  // dependências CommonJS empacotadas em ESM ainda chamam require()
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'warning',
})
console.log('dist-electron/main.mjs')

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

import { relatorioApi } from './server/relatorio-api'

// Design system: base-components/components/lib/hooks em `vendor/design-system`,
// importados com os caminhos `@/...` —
// mesmo arranjo do demonstration-media/editor. Sincronize com `paths` do tsconfig.app.json.
const DS_SRC = path.resolve(
  __dirname,
  process.env.DESIGN_SYSTEM_DIR ?? 'vendor/design-system',
  'src'
)
const DS_SHARED = [
  'atomic/base-components',
  'atomic/components',
  'atomic/features/settings',
  'assets',
  'hooks',
  'lib',
  'services/query-client',
  'services/query-retry',
  'utils/is-editable-target',
]

/** Pasta de dados no `yarn dev`: a raiz do projeto (entrada/, dados/, saida/). */
const DEV_DATA_DIR = process.env.RELATORIO_DATA_DIR ?? path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr(), relatorioApi({ dataRoot: DEV_DATA_DIR })],
  resolve: {
    // Os arquivos do design system importam react/jotai/... do node_modules DELE; dedupe força
    // a mesma instância deste app (dois Reacts quebram hooks; dois jotai/sonner/i18next
    // separariam stores, toasts e traduções).
    dedupe: [
      'react',
      'react-dom',
      'jotai',
      'i18next',
      'react-i18next',
      'sonner',
      '@tanstack/react-query',
      'framer-motion',
    ],
    alias: [
      ...DS_SHARED.map((dir) => ({
        find: new RegExp(`^@/${dir}(?=/|$)`),
        replacement: path.join(DS_SRC, dir),
      })),
      { find: /^@server\//, replacement: path.resolve(__dirname, 'server') + '/' },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
  build: { chunkSizeWarningLimit: 2000 },
  server: {
    port: 3200,
    fs: { allow: [path.resolve(__dirname), DS_SRC] },
  },
})

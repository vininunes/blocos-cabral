// Confere que a cópia do design system (vendor/design-system) e as dependências existem
// antes de rodar o Vite/tsc.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ds = path.resolve(raiz, process.env.DESIGN_SYSTEM_DIR ?? 'vendor/design-system')

if (!fs.existsSync(path.join(ds, 'src/atomic/base-components'))) {
  console.error(`Design system não encontrado em ${ds}.`)
  process.exit(1)
}
if (!fs.existsSync(path.join(raiz, 'node_modules/react'))) {
  console.error('Dependências não instaladas. Rode: yarn install (dentro de desktop/)')
  process.exit(1)
}

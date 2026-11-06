// Testes do motor do relatório (server/relatorio), em Node.
//
// A maior parte usa os exports reais do Bling (../entrada) e o gabarito congelado
// (tests/golden). Esses arquivos têm dados de clientes e não vão para o repositório: sem eles,
// os testes que dependem deles são pulados e rodam só os que não precisam de dados.
import { defineConfig } from 'vitest/config'
import fs from 'node:fs'
import path from 'node:path'

const temDados =
  fs.existsSync(path.resolve(__dirname, '../entrada/vendas_2026-10-17-14-39-51.csv')) &&
  fs.existsSync(path.resolve(__dirname, 'tests/golden/base1.json'))

const COM_DADOS = [
  'tests/paridade.test.ts',
  'tests/relatorio.test.ts',
  'tests/exportacao.test.ts',
  'tests/migracao.test.ts',
  'tests/banco.test.ts',
  'tests/provisao.test.ts',
]

if (!temDados)
  console.warn('[vitest] sem ../entrada e tests/golden: pulando os testes com dados reais')

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: temDados ? [] : COM_DADOS,
    passWithNoTests: true,
    environment: 'node',
    testTimeout: 60_000,
  },
})

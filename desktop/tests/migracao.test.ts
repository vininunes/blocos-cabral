/** Migração da base do app antigo: tests/golden/base1-legado.xlsx foi gravada pelo app Python. */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Base } from '../server/relatorio/base'
import { Relatorio } from '../server/relatorio/metricas'
import { migrarBaseAntiga } from '../server/relatorio/migracao'
import { Periodo } from '../server/relatorio/periodo'
import { criarServico } from '../server/relatorio/servico'
import { diferencas } from './comum'

const GOLDEN = path.join(__dirname, 'golden')
type TabelaPy = { colunas: string[]; linhas: unknown[][] }
const esperado = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'base1.json'), 'utf-8'))
  .base as Record<string, TabelaPy>
const comoTabela = (rs: object[], colunas: string[]) => ({
  colunas,
  linhas: rs.map((r) => colunas.map((c) => (r as Record<string, unknown>)[c] ?? null)),
})

/** Pasta temporária no formato do app antigo: dados/base.xlsx + entrada/. */
function appAntigo() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'app-antigo-'))
  fs.mkdirSync(path.join(raiz, 'dados'))
  fs.mkdirSync(path.join(raiz, 'entrada'))
  fs.copyFileSync(path.join(GOLDEN, 'base1-legado.xlsx'), path.join(raiz, 'dados', 'base.xlsx'))
  fs.writeFileSync(path.join(raiz, 'entrada', 'vendas_teste.csv'), 'x')
  return raiz
}

describe('migração da base.xlsx do app antigo', () => {
  it('traz propostas, pedidos, notas e itens iguais aos do Python, com o feedback', async () => {
    const antigo = appAntigo()
    const novo = fs.mkdtempSync(path.join(os.tmpdir(), 'app-novo-'))
    const b = new Base(path.join(novo, 'dados', 'base.json'))
    const r = await migrarBaseAntiga(
      b,
      path.join(antigo, 'dados', 'base.xlsx'),
      path.join(novo, 'entrada')
    )
    expect(r).toMatchObject({
      propostas: 74,
      pedidos: 211,
      notas: 164,
      comFeedback: 1,
      arquivosCopiados: 1,
    })

    // feedback gravado no app antigo antes de salvar a planilha
    const props = esperado.propostas
    const jP = props.colunas.indexOf('proposta')
    const linhas = props.linhas.map((l) => {
      if (l[jP] !== '25010') return l
      const c = [...l]
      c[props.colunas.indexOf('motivo')] = 'Preço'
      c[props.colunas.indexOf('comentario')] = 'Cliente achou caro; voltar a falar em dezembro'
      return c
    })
    const tabelas: [string, object[], TabelaPy][] = [
      ['propostas', b.propostas, { ...props, linhas }],
      ['pedidos', b.pedidos, esperado.pedidos],
      ['notas', b.notas, esperado.notas],
      ['itensPropostas', b.itensPropostas, esperado.itensPropostas],
    ]
    for (const [nome, registros, tabela] of tabelas) {
      expect(diferencas(comoTabela(registros, tabela.colunas), tabela), nome).toEqual([])
    }
    expect(b.t.arquivos.map((a) => a.hash).every(Boolean)).toBe(true)
    expect(fs.existsSync(path.join(novo, 'entrada', 'vendas_teste.csv'))).toBe(true)

    // relatório na base migrada = relatório da base importada (faturamento da semana do Bling)
    expect(new Relatorio(b, Periodo.de('Semana', '2026-10-16')).kpis()[0].atual).toBeCloseTo(
      477_787.51,
      2
    )
    // gravada em JSON e relida
    b.salvar()
    expect(
      new Base(path.join(novo, 'dados', 'base.json')).propostas.find((p) => p.proposta === '25010')
        ?.motivo
    ).toBe('Preço')
  })
  it('o serviço migra sozinho no primeiro uso e não repete depois', async () => {
    const antigo = appAntigo()
    const novo = fs.mkdtempSync(path.join(os.tmpdir(), 'app-novo-'))
    const pastas = {
      entrada: path.join(novo, 'entrada'),
      dados: path.join(novo, 'dados'),
      saida: path.join(novo, 'saida'),
    }
    const basesAntigas = [
      path.join(novo, 'nao-existe.xlsx'),
      path.join(antigo, 'dados', 'base.xlsx'),
    ]
    const s1 = criarServico(pastas, { basesAntigas })
    await s1.pronto
    expect(s1.estado().migracao?.propostas).toBe(74)
    expect(fs.existsSync(path.join(novo, 'dados', 'base.json'))).toBe(true)
    // com base.json existente, não migra de novo (o feedback novo não é sobrescrito)
    s1.salvarFeedback({ edicoes: { '25009': { comentario: 'novo' } } })
    const s2 = criarServico(pastas, { basesAntigas })
    await s2.pronto
    expect(s2.estado().migracao).toBeNull()
    expect(s2.base.propostas.find((p) => p.proposta === '25009')?.comentario).toBe('novo')
  })
})

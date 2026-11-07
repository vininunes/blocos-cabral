/**
 * Regressão dos números: tests/golden/*.json é um gabarito congelado (conferido com o Bling)
 * com a base e os relatórios esperados. Mesma base, mesmos cenários, mesmos números.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import type { Base } from '../server/relatorio/base'
import {
  DIMENSOES,
  Relatorio,
  type Dimensao,
  type Filtro,
  type Tabela,
} from '../server/relatorio/metricas'
import {
  comparacao,
  Periodo,
  type ModoComparacao,
  type TipoPeriodo,
} from '../server/relatorio/periodo'
import { baseCom, diferencas } from './comum'

type TabelaPy = { colunas: string[]; linhas: unknown[][] }
type Cenario = {
  tipo: TipoPeriodo
  ancora: string
  de: string | null
  ate: string | null
  modo: ModoComparacao
  filtro: Filtro
  a: unknown
  b: unknown
  rel: Record<string, unknown> & { variacoes: Record<string, TabelaPy> }
}
type Golden = {
  arquivos: string[]
  resumo: Record<string, unknown>
  base: Record<string, TabelaPy | unknown[]>
  cenarios: Cenario[]
}

const golden = (nome: string): Golden =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', nome), 'utf-8'))

/** Registros da base no formato { colunas, linhas } do gabarito. */
function comoTabela(registros: object[], colunas: string[]) {
  return {
    colunas,
    linhas: registros.map((r) => colunas.map((c) => (r as Record<string, unknown>)[c] ?? null)),
  }
}

/**
 * Listas ordenadas por valor: o pandas usa quicksort (instável) e o empate pode sair em
 * outra ordem. Compara as linhas ordenadas por todas as colunas.
 */
const ordenada = (t: TabelaPy | Tabela) => ({
  colunas: t.colunas,
  linhas: [...t.linhas].sort((x, y) => (JSON.stringify(x) < JSON.stringify(y) ? -1 : 1)),
})

/**
 * Rankings: empates de valor saem em ordem arbitrária no pandas (sort instável); o TS
 * desempata pelo nome. Compara ordenando pela coluna do ranking e, no empate, pela linha.
 */
function ranking(t: TabelaPy | Tabela, coluna: string) {
  const j = t.colunas.indexOf(coluna)
  return {
    colunas: t.colunas,
    linhas: [...t.linhas].sort((x, y) => {
      const d = Number(y[j]) - Number(x[j])
      if (Math.abs(d) > 1e-6) return d
      return JSON.stringify(x) < JSON.stringify(y) ? -1 : 1
    }),
  }
}
const RANKINGS: Record<string, string> = {
  clientes: 'Valor',
  cidades: 'Valor',
  produtos: 'Valor',
  motivos: 'Qtd',
}

function conferirBase(b: Base, g: Golden) {
  const tabelas: [string, object[]][] = [
    ['propostas', b.propostas],
    ['pedidos', b.pedidos],
    ['pedidosAgregados', b.pedidosAgregados()],
    ['notas', b.notas],
    ['itensPropostas', b.itensPropostas],
  ]
  for (const [nome, registros] of tabelas) {
    const esperado = g.base[nome] as TabelaPy
    expect(diferencas(comoTabela(registros, esperado.colunas), esperado), nome).toEqual([])
  }
  expect(b.cobertura()).toEqual(g.base.cobertura)
}

function conferirCenario(b: Base, c: Cenario) {
  const p = Periodo.de(c.tipo, c.ancora, c.de, c.ate)
  const [a, bb] = comparacao(p, c.modo, b.cobertura()[1]!)
  expect(diferencas(JSON.parse(JSON.stringify([a, bb])), [c.a, c.b]), 'períodos').toEqual([])
  const r = new Relatorio(b, a, c.filtro, bb, c.modo)
  const g = c.rel
  const pf = r.pedidosFiltrados()
  const obtido: Record<string, unknown> = {
    nomeA: r.nomeA,
    nomeB: r.nomeB,
    coberturaB: r.coberturaB,
    kpis: JSON.parse(JSON.stringify(r.kpis())),
    grupos: r.grupos().map(([t, ks]) => [t, ks.map((k) => k.nome)]),
    acumulado: r.acumulado(),
    evolucao: r.evolucao(),
    vendedores: r.vendedores(),
    clientes: r.clientes(50),
    cidades: r.cidades(50),
    produtos: r.produtos(50),
    funil: r.funil(),
    motivos: r.motivos(),
    lista: ordenada(r.lista()),
    aguardandoNota: ordenada(r.aguardandoNota()),
    pedidosFiltrados: pf.tabela,
    pedidosExplicacao: pf.explicacao,
    propostasFiltradas: r.propostasFiltradas().map((x) => x.proposta),
    variacoes: Object.fromEntries(
      Object.keys(DIMENSOES).map((d) => [d, r.variacoes(d as Dimensao, 10)])
    ),
  }
  const esperado: Record<string, unknown> = {
    ...g,
    lista: ordenada(g.lista as TabelaPy),
    aguardandoNota: ordenada(g.aguardandoNota as TabelaPy),
  }
  if (c.filtro === 'Todos') obtido.todosPedidos = r.todosPedidos()
  // regra nova da carteira: só propostas com até 90 dias, idade contada até o último dia com
  // dados. A faixa "Mais de 90 dias" saiu e a distribuição por idade mudou; o total da carteira
  // (valor e quantidade) continua igual ao gabarito, porque a base de teste só tem outubro.
  if (c.filtro === 'Em processo') {
    const total = (t: TabelaPy | Tabela, j: number) =>
      t.linhas.reduce((s, l) => s + Number(l[j] ?? 0), 0)
    const ev = esperado.evolucao as TabelaPy
    const ob = obtido.evolucao as Tabela
    expect(ob.linhas.map((l) => l[0])).not.toContain('Mais de 90 dias')
    expect(total(ob, 1)).toBeCloseTo(total(ev, 1), 2)
    expect(total(ob, 2)).toBe(total(ev, 2))
    delete obtido.evolucao
    delete esperado.evolucao
    // coluna Idade da lista: também contada até o último dia com dados
    const semIdade = (t: TabelaPy | Tabela) => {
      const j = t.colunas.indexOf('Idade')
      return { ...t, linhas: t.linhas.map((l) => l.filter((_, k) => k !== j)) }
    }
    obtido.lista = semIdade(obtido.lista as Tabela)
    esperado.lista = semIdade(esperado.lista as TabelaPy)
  }
  const colVendedores = c.filtro === 'Todos' ? 'Faturado' : 'Valor'
  for (const [nome, col] of [...Object.entries(RANKINGS), ['vendedores', colVendedores]]) {
    obtido[nome] = ranking(obtido[nome] as Tabela, col)
    esperado[nome] = ranking(esperado[nome] as TabelaPy, col)
  }
  const erros = diferencas(obtido, esperado)
  expect(erros, `${c.tipo} ${c.ancora} · ${c.modo} · ${c.filtro}`).toEqual([])
}

describe.each(['base1.json', 'base2.json'])('gabarito (%s)', (arquivo) => {
  const g = golden(arquivo)
  const pronto = baseCom(g.arquivos)

  it('importa igual (resumo e tabelas da base)', async () => {
    const { b, r } = await pronto
    expect(diferencas(r, g.resumo)).toEqual([])
    conferirBase(b, g)
  })

  it(`relatórios iguais em ${g.cenarios.length} cenários`, async () => {
    const { b } = await pronto
    for (const c of g.cenarios) conferirCenario(b, c)
  })
})

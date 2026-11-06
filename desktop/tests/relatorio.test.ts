/**
 * Port de ../tests/test_relatorio.py: exports reais de outubro/2026, valores conferidos com o Bling.
 * (PPT e Excel entram na fase 4.)
 */
import { beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Base, guardarEmEntrada } from '../server/relatorio/base'
import * as C from '../server/relatorio/config'
import { FILTROS, Relatorio, TODOS, type Filtro, type Tabela } from '../server/relatorio/metricas'
import {
  ANO_ANTERIOR,
  ANTERIOR,
  comparacao,
  MESMA_DATA,
  Periodo,
  PERSONALIZADO,
  SEM_COMPARACAO,
  type TipoPeriodo,
} from '../server/relatorio/periodo'
import { fmtMoeda, fmtQtd } from '../server/relatorio/utils'
import { ARQS, arquivos, ENTRADA } from './comum'

const SEMANA = Periodo.de('Semana', '2026-10-16')
const MES = Periodo.de('Mês', '2026-10-01')
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'relatorio-'))
const col = (t: Tabela, nome: string) => t.linhas.map((l) => l[t.colunas.indexOf(nome)])
const kpi = (r: Relatorio) => Object.fromEntries(r.kpis().map((k) => [k.nome, k]))
/** Mesmo CSV de orçamentos com linhas trocadas (utf-8 com BOM, como o Bling exporta). */
const BOM = String.fromCharCode(0xfeff)
const orcamentoComTroca = (troca: (linha: string) => string) =>
  new TextEncoder().encode(
    BOM +
      fs
        .readFileSync(path.join(ENTRADA, ARQS[1]), 'utf-8')
        .replace(BOM, '')
        .split(/\r?\n/)
        .map(troca)
        .join('\n')
  )

let base: Base
beforeAll(async () => {
  base = new Base()
  const r = await base.importar(arquivos())
  expect(r.erros).toEqual([])
})

describe('importação', () => {
  it('lê os três exports do Bling', () => {
    const p = base.pedidosAgregados()
    expect(p.length).toBe(211)
    expect(base.pedidos.length).toBe(460)
    expect(p.reduce((a, x) => a + x.total_pedido, 0)).toBeCloseTo(1_569_174.76, 2)
    expect(base.notas.length).toBe(164)
    expect(base.notas.reduce((a, x) => a + x.total_nota, 0)).toBeCloseTo(1_198_426.87, 2) // "Notas por Cliente" do Bling
    expect(base.notas.filter((n) => n.pedido !== '').length).toBe(162)
    expect(base.propostas.length).toBe(74)
    expect(base.itensPropostas.length).toBe(484)
    // proposta com pedido mas sem nota continua Aprovado (entrega só com nota)
    const conta: Record<string, number> = {}
    for (const p of base.propostas) conta[p.status] = (conta[p.status] ?? 0) + 1
    expect(conta).toEqual({ [C.PROCESSO]: 47, [C.FATURADO]: 16, [C.APROVADO]: 8, [C.CANCELADO]: 3 })
  })

  it('reimportação não duplica (JSON salvo e relido)', async () => {
    const arq = path.join(tmp(), 'base.json')
    const b = new Base(arq)
    await b.importar(arquivos())
    b.salvar()
    const b2 = new Base(arq)
    expect((await b2.importar(arquivos())).ignorados).toEqual(ARQS) // identificados pelo conteúdo
    const r = await b2.importar(arquivos(), true)
    expect(r.mudancas).toBe(0)
    expect([b2.propostas.length, b2.pedidos.length, b2.notas.length]).toEqual([74, 460, 164])
  })

  it('mudança de situação grava a data da mudança', async () => {
    const b = new Base()
    await b.importar(arquivos())
    const novo = orcamentoComTroca((l) =>
      l.includes('"24998"')
        ? l.replace('"Rascunho"', '"Aprovado"')
        : l.includes('"25023"')
          ? l.replace('"Rascunho"', '"Não aprovado"')
          : l
    )
    const r = await b.importar([{ nome: 'orcamentos_2026-10-20-09-00-00.csv', conteudo: novo }])
    expect(r.mudancas).toBe(2)
    const p = Object.fromEntries(b.propostas.map((x) => [x.proposta, x]))
    expect(p['24998'].status).toBe(C.APROVADO)
    expect(p['24998'].dt_aprovacao).toBe('2026-10-20T09:00:00')
    expect(p['25023'].status).toBe(C.CANCELADO)
    expect(p['25023'].historico).toContain('Rascunho -> Não aprovado')
  })

  it('feedback é preservado na reimportação', async () => {
    const arq = path.join(tmp(), 'base.json')
    const b = new Base(arq)
    await b.importar(arquivos())
    b.editarPropostas({ '25010': { motivo: 'Preço', comentario: 'Cliente achou caro' } })
    b.salvar()
    const b2 = new Base(arq)
    await b2.importar(arquivos(), true)
    const p = b2.propostas.find((x) => x.proposta === '25010')!
    expect([p.motivo, p.comentario]).toEqual(['Preço', 'Cliente achou caro'])
    expect(['Preço', 'Não informado']).toContain(new Relatorio(b2, SEMANA).motivos().linhas[0][0])
  })

  it('identifica o arquivo pelo conteúdo', async () => {
    const b = new Base()
    await b.importar(arquivos())
    const pdf = arquivos([ARQS[2]])[0].conteudo
    let r = await b.importar([{ nome: 'Notas faturadas outubro.pdf', conteudo: pdf }])
    expect(r.importados).toEqual([])
    expect(r.ignorados[0]).toContain('mesmo conteúdo')
    let trocou = false
    const orc = orcamentoComTroca((l) => {
      if (trocou || !l.includes('"Rascunho"')) return l
      trocou = true
      return l.replace('"Rascunho"', '"Aprovado"')
    })
    r = await b.importar([{ nome: ARQS[1], conteudo: orc }])
    expect(r.importados.length).toBe(1)
    expect(r.mudancas).toBe(1)
    expect(b.propostas.length).toBe(74)
  })

  it('guardar em entrada/ não sobrescreve outro arquivo', () => {
    const pasta = tmp()
    const enc = (s: string) => new TextEncoder().encode(s)
    expect(guardarEmEntrada(pasta, 'Notas.pdf', enc('a'))).toBe('Notas.pdf')
    expect(guardarEmEntrada(pasta, 'Notas.pdf', enc('a'))).toBe('Notas.pdf') // idêntico: mesmo arquivo
    expect(guardarEmEntrada(pasta, 'Notas.pdf', enc('b'))).toBe('Notas (2).pdf') // diferente: nome novo
    expect(fs.readFileSync(path.join(pasta, 'Notas.pdf'), 'utf-8')).toBe('a')
  })

  it('recusa PDF que não é o relatório de notas', async () => {
    const r = await new Base().importar(arquivos(['Notas Fiscais por Operação - Bling.pdf']))
    expect(r.erros[0]).toContain("não é o relatório 'Notas Fiscais por Operação'")
  })
})

describe('relatório', () => {
  it('faturamento igual ao "Evolução do Faturamento" do Bling', () => {
    const bling: Record<number, number> = {
      13: 114_852.5,
      14: 111_528.63,
      15: 123_318.92,
      16: 128_087.46,
    }
    for (const [d, valor] of Object.entries(bling)) {
      expect(new Relatorio(base, Periodo.de('Dia', `2026-10-${d}`)).kpis()[0].atual).toBeCloseTo(
        valor,
        2
      )
    }
    expect(new Relatorio(base, SEMANA).kpis()[0].atual).toBeCloseTo(477_787.51, 2)
    expect(new Relatorio(base, MES).kpis()[0].atual).toBeCloseTo(1_198_426.87, 2)
  })

  it('KPIs da semana', () => {
    const k = kpi(new Relatorio(base, SEMANA))
    // entrega = data da nota do pedido; pedido sem nota não entra em Entregue
    expect(k['Entregue (pedidos)'].atual).toBeCloseTo(468_219.8, 2)
    expect(k['Entregue (pedidos)'].anterior).toBeCloseTo(519_763.37, 2)
    expect(k['Pedidos entregues'].atual).toBe(64)
    expect(k['Aguardando nota'].atual).toBeCloseTo(225_010.57, 2) // pedidos da semana sem nota
    expect(k['Vendas aprovadas'].atual).toBeCloseTo(183_148.94, 2)
    expect(k['Propostas canceladas'].atual).toBe(3)
    expect(k['Carteira em processo'].atual).toBeCloseTo(7_360_546.61, 2)
  })

  it('filtros por status', () => {
    const esperado: Record<string, number> = {
      [C.PROCESSO]: 47,
      [C.APROVADO]: 11,
      [C.ENTREGUE]: 64,
      [C.FATURADO]: 65,
      [C.CANCELADO]: 3,
    }
    for (const [st, n] of Object.entries(esperado)) {
      const r = new Relatorio(base, SEMANA, st as Filtro)
      expect(r.kpis()[0].atual).toBe(n)
      expect(r.lista().linhas.length).toBe(n)
    }
  })

  it('data de entrega é a da nota', () => {
    const notaDoPedido = new Map(base.notas.filter((n) => n.pedido).map((n) => [n.pedido, n]))
    for (const per of [SEMANA, MES]) {
      for (const x of new Relatorio(base, per).conjunto(C.ENTREGUE)) {
        expect(notaDoPedido.has(x.chave)).toBe(true)
        expect(x.data).toBe(notaDoPedido.get(x.chave)!.data)
      }
    }
    const ag = new Relatorio(base, MES).aguardandoNota()
    expect(ag.linhas.length).toBe(49)
    expect(col(ag, 'Pedido').some((p) => notaDoPedido.has(p as string))).toBe(false)
    expect(new Relatorio(base, SEMANA).aguardandoNota().linhas.length).toBe(27)
    expect(base.propostas.filter((p) => p.nf === '').every((p) => p.dt_entrega === null)).toBe(true)
  })

  it('abas Pedidos e Feedback obedecem período e status', () => {
    const ped = (f: Filtro, per = SEMANA) => new Relatorio(base, per, f).pedidosFiltrados().tabela
    expect(ped(TODOS).linhas.length).toBe(90) // feitos na semana
    expect(ped(TODOS, MES).linhas.length).toBe(211)
    expect(ped(C.ENTREGUE).linhas.length).toBe(64)
    expect(col(ped(C.ENTREGUE), 'Entregue').every((x) => x === 'Sim')).toBe(true)
    expect(new Set(col(ped(C.FATURADO), 'Pedido'))).toEqual(new Set(col(ped(C.ENTREGUE), 'Pedido')))
    expect(ped(C.CANCELADO).linhas.length).toBe(0)
    expect(ped(C.PROCESSO).linhas.length).toBe(0)
    const pedidosDePropostas = new Set(base.propostas.map((p) => p.pedido))
    expect(col(ped(C.APROVADO), 'Pedido').every((p) => pedidosDePropostas.has(p as string))).toBe(
      true
    )
    expect(new Relatorio(base, SEMANA, C.CANCELADO).propostasFiltradas().length).toBe(3)
    expect(new Relatorio(base, SEMANA, C.PROCESSO).propostasFiltradas().length).toBe(47)
    // abas de ranking usam o conjunto do status no período
    for (const f of FILTROS.slice(1)) {
      const r = new Relatorio(base, SEMANA, f)
      const total = r.conjunto(f).reduce((a, x) => a + x.valor, 0)
      expect(
        (col(r.clientes(), 'Valor') as number[]).reduce((a, x) => a + x, 0)
      ).toBeLessThanOrEqual(total + 0.01)
    }
  })

  it('funil: entregues só com nota', () => {
    const f = Object.fromEntries(
      new Relatorio(base, SEMANA).funil().linhas.map((l) => [l[0], l[1]])
    )
    expect(f['Aprovadas']).toBe(6)
    expect(f['Com pedido, aguardando nota']).toBe(3) // 25059, 25063, 25069
    expect(f['Entregues (com nota)']).toBe(3) // 25043, 25061, 25065
  })

  it('formato de moeda e quantidade', () => {
    expect(fmtMoeda(138666.30000000002)).toBe('R$ 138.666,30')
    expect(fmtMoeda(6.77)).toBe('R$ 6,77')
    expect(fmtQtd(0.1)).toBe('0,10')
    expect(fmtQtd(16288)).toBe('16.288')
  })
})

describe('períodos', () => {
  it.each(['Dia', 'Semana', 'Mês', 'Trimestre', 'Semestre', 'Ano'] as TipoPeriodo[])(
    '%s',
    (tipo) => {
      const p = Periodo.de(tipo, '2026-10-16')
      expect(p.inicio <= '2026-10-16' && '2026-10-16' <= p.fim).toBe(true)
      expect(p.anterior().fim < p.inicio).toBe(true)
      expect(p.deslocar(1).anterior().igual(p)).toBe(true)
    }
  )

  it('comparação até a mesma data, anterior, ano anterior e personalizado', () => {
    let [a, b] = comparacao(MES, MESMA_DATA, '2026-10-16')
    expect([a.inicio, a.fim, a.parcial]).toEqual(['2026-10-01', '2026-10-16', true])
    expect([b!.inicio, b!.fim]).toEqual(['2026-09-01', '2026-09-16'])
    expect(a.curto).toBe('Out/26 até 16/10')
    expect(b!.rotulo).toBe('Setembro de 2026 (até 16/09)')
    // mês anterior sem o dia: usa o último dia do mês
    expect(comparacao(Periodo.de('Mês', '2026-03-01'), MESMA_DATA, '2026-03-30')[1]!.fim).toBe(
      '2026-02-28'
    )
    expect(comparacao(Periodo.de('Mês', '2028-03-01'), MESMA_DATA, '2028-03-30')[1]!.fim).toBe(
      '2028-02-29'
    ) // bissexto
    // período já fechado: igual ao período anterior inteiro
    const fev = Periodo.de('Mês', '2026-02-01')
    ;[a, b] = comparacao(fev, MESMA_DATA, '2026-10-16')
    expect(a.igual(fev) && b!.igual(fev.anterior())).toBe(true)
    expect(b!.fim).toBe('2026-01-31')
    // semana parcial: seg-sex x seg-sex
    ;[a, b] = comparacao(SEMANA, MESMA_DATA, '2026-10-16')
    expect([a.fim, b!.inicio, b!.fim]).toEqual(['2026-10-16', '2026-10-05', '2026-10-09'])
    // período anterior não corta
    ;[a, b] = comparacao(MES, ANTERIOR, '2026-10-16')
    expect(a.igual(MES) && b!.igual(MES.anterior())).toBe(true)
    // ano anterior: mesmo corte; semana volta 52 semanas (mesmo dia da semana)
    ;[a, b] = comparacao(MES, ANO_ANTERIOR, '2026-10-16')
    expect([b!.inicio, b!.fim]).toEqual(['2025-10-01', '2025-10-16'])
    ;[a, b] = comparacao(SEMANA, ANO_ANTERIOR, '2026-10-16')
    expect(new Date(b!.inicio).getUTCDay()).toBe(1)
    expect(b!.inicio.startsWith('2025') && b!.dias === a.dias).toBe(true)
    // personalizado
    ;[a, b] = comparacao(MES, PERSONALIZADO, '2026-10-16', '2026-09-20', '2026-09-05')
    expect(a.igual(MES)).toBe(true)
    expect([b!.inicio, b!.fim]).toEqual(['2026-09-05', '2026-09-20'])
  })

  it('relatório comparado (A x B)', () => {
    const [a, b] = comparacao(SEMANA, MESMA_DATA, base.cobertura()[1]!)
    const r = new Relatorio(base, a, TODOS, b, MESMA_DATA)
    expect(r.coberturaB).toBe('total')
    const k = kpi(r)
    const f = k['Faturamento (notas)']
    // semana até sexta 16/10: faturamento da semana inteira (não há notas no fim de semana)
    expect(f.atual).toBeCloseTo(477_787.51, 2)
    // diferença = A - B; variação = A / B - 1
    expect(f.delta).toBeCloseTo(f.atual - f.anterior!, 6)
    expect(f.delta!).toBeLessThan(0)
    expect(f.variacao).toBeCloseTo(f.atual / f.anterior! - 1, 9)
    expect(f.melhorou).toBe(false) // faturamento caiu: piora
    expect(k['Vendas aprovadas'].melhorou).toBe(true) // aprovadas subiram: melhora
    expect(k['Propostas canceladas'].melhorou).toBe(false) // cancelamentos subiram: piora
    // cartões: todos os indicadores aparecem uma única vez, destaques primeiro
    const g = r.grupos()
    expect(g[0][0]).toBe('Destaques')
    expect(g.reduce((s, [, ks]) => s + ks.length, 0)).toBe(r.kpis().length)
    // curva acumulada termina no total do período
    const ac = r.acumulado()
    const ultimo = (nome: string) => (col(ac, nome).filter((x) => x !== null) as number[]).at(-1)
    expect(ultimo(r.nomeA)).toBeCloseTo(f.atual, 2)
    expect(ultimo(r.nomeB)).toBeCloseTo(f.anterior!, 2)
    // altas e quedas: diferença = A - B, altas positivas, quedas negativas
    const mv = r.variacoes('Clientes')
    for (const l of mv.linhas) {
      const [mov, , va, vb, d] = l as [string, string, number, number, number]
      expect(mov === 'Alta' ? d > 0 : d < 0).toBe(true)
      expect(Math.abs(d - (va - vb))).toBeLessThan(0.01)
    }
    expect(r.clientes().colunas).toEqual(
      expect.arrayContaining(['Valor anterior', 'Diferença', 'Variação'])
    )
  })

  it('comparação sem dados de B', () => {
    const [a, b] = comparacao(MES, MESMA_DATA, base.cobertura()[1]!)
    const r = new Relatorio(base, a, TODOS, b, MESMA_DATA)
    expect(r.coberturaB).toBe('nenhuma')
    expect(col(r.acumulado(), r.nomeB).every((x) => x === null)).toBe(true)
  })

  it('sem comparação', () => {
    const [a, b] = comparacao(MES, SEM_COMPARACAO, '2026-10-16')
    expect(a.igual(MES) && b === null).toBe(true) // período inteiro, sem corte
    for (const f of FILTROS) {
      const r = new Relatorio(base, a, f, b, SEM_COMPARACAO)
      expect(r.compara).toBe(false)
      expect(r.coberturaB).toBe('total')
      expect(r.clientes().colunas).not.toEqual(expect.arrayContaining(['Valor anterior']))
      expect(r.vendedores().colunas.some((c) => c.includes('anterior') || c === 'Variação')).toBe(
        false
      )
    }
  })
})

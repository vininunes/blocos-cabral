/** Provisão mensal de clientes: dias úteis, rateio do mês e provisionado x realizado no período. */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Base, guardarEmEntrada } from '../server/relatorio/base'
import { diasUteis, diasUteisDoMes, feriados } from '../server/relatorio/dias-uteis'
import { Periodo } from '../server/relatorio/periodo'
import { calcularProvisao, provisaoDoMes, provisaoNoDia } from '../server/relatorio/provisao'
import { ARQS, arquivos, baseCom } from './comum'

const SEMANA = Periodo.de('Semana', '2026-10-16')

/** CNPJ do cliente com maior faturamento na semana (o teste não fixa clientes reais). */
function maiorClienteDaSemana(b: Base) {
  const porCnpj = new Map<string, number>()
  for (const n of b.notas)
    if (n.cnpj && n.data! >= '2026-10-12' && n.data! <= '2026-10-18')
      porCnpj.set(n.cnpj, (porCnpj.get(n.cnpj) ?? 0) + n.total_nota)
  return [...porCnpj.entries()].sort((x, y) => y[1] - x[1])[0][0]
}

describe('dias úteis', () => {
  it('segunda a sexta sem feriados nacionais', () => {
    expect(diasUteis('2026-10-01', '2026-10-31').length).toBe(21) // 22 dias de semana - 12/10
    expect(diasUteis('2026-10-12', '2026-10-18')).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ])
    expect(feriados(2026).has('2026-04-03')).toBe(true) // Sexta-feira Santa (Páscoa 05/04/2026)
    expect(feriados(2027).has('2027-03-26')).toBe(true) // Páscoa 28/03/2027
    expect(feriados(2026).has('2026-11-20')).toBe(true) // Consciência Negra
  })
})

describe('provisão mensal', () => {
  it('dias úteis do mês e provisão por dia útil', () => {
    expect(diasUteisDoMes('2026-10')).toBe(21)
    const b = new Base()
    const ls = b.salvarProvisoes('x', 2026, [
      { mes: '2026-10', valor: 42_000 },
      { mes: '2026-11', valor: null },
      { mes: '2027-01', valor: 9 }, // fora do ano: ignorado
    ])
    expect(ls.map((l) => [l.mes, l.valor])).toEqual([['2026-10', 42_000]])
    expect(provisaoDoMes(ls, '2026-10-20')).toBe(42_000)
    expect(provisaoNoDia(ls, '2026-10-20')).toBe(2_000)
    expect(provisaoNoDia(ls, '2026-11-03')).toBe(0)
    expect(() => b.salvarProvisoes('x', 2026, [{ mes: '2026-10', valor: -1 }])).toThrow()
    expect(() => b.lancarProvisaoEmLote(['x'], [{ mes: '2026-13', valor: 1 }])).toThrow()
  })

  it('salvar troca só os meses do ano enviado', () => {
    const b = new Base()
    b.salvarProvisoes('x', 2026, [
      { mes: '2026-01', valor: 1 },
      { mes: '2026-02', valor: 2 },
    ])
    b.salvarProvisoes('x', 2027, [{ mes: '2027-01', valor: 3 }])
    b.salvarProvisoes('x', 2026, [{ mes: '2026-02', valor: 5 }])
    expect(b.provisoesDe('x').map((l) => [l.mes, l.valor])).toEqual([
      ['2026-02', 5],
      ['2027-01', 3],
    ])
  })

  it('provisionado x realizado na semana: parte do mês pelos dias úteis (12/10 é feriado)', async () => {
    const { b } = await baseCom()
    const cliente = maiorClienteDaSemana(b)
    b.salvarProvisoes(cliente, 2026, [{ mes: '2026-10', valor: 42_000 }]) // 2 mil por dia útil
    const r = calcularProvisao(b, SEMANA, b.cobertura()[1])
    const realCliente = b.notas
      .filter((n) => n.cnpj === cliente && n.data! >= '2026-10-12' && n.data! <= '2026-10-18')
      .reduce((s, n) => s + n.total_nota, 0)
    expect(r.diasUteis).toBe(4)
    expect(r.provisionado).toBeCloseTo(8_000, 6)
    expect(r.realizado).toBeCloseTo(realCliente, 2)
    expect(r.atingido).toBeCloseTo(realCliente / 8_000, 9)
    expect(r.clientesComProvisao).toBe(1)
    const total = b.notas
      .filter((n) => n.data! >= '2026-10-12' && n.data! <= '2026-10-18')
      .reduce((s, n) => s + n.total_nota, 0)
    expect(r.realizado + r.realizadoSemProvisao).toBeCloseTo(total, 2)
    const l = r.tabela.linhas[0]
    expect(r.tabela.colunas.slice(2, 4)).toEqual(['Dias úteis', 'Provisionado'])
    expect(l[2]).toBe(4)
    expect(l[3]).toBeCloseTo(8_000, 6)
    const ultimo = r.acumulado.linhas.at(-1)!
    expect(ultimo[3]).toBeCloseTo(8_000, 6)
    expect(ultimo[2]).toBeNull() // realizado vazio depois de 16/10 (fim dos dados)
  })

  it('período que cruza dois meses soma a parte de cada um', () => {
    const b = new Base()
    b.salvarProvisoes('x', 2026, [
      { mes: '2026-09', valor: 21_000 }, // 21 dias úteis (07/09 é feriado) -> 1 mil/dia
      { mes: '2026-10', valor: 42_000 }, // 21 dias úteis -> 2 mil/dia
    ])
    const per = Periodo.de('Personalizado', '2026-09-28', '2026-09-28', '2026-10-02')
    // 28, 29, 30/09 (3 x 1 mil) + 01, 02/10 (2 x 2 mil)
    expect(calcularProvisao(b, per, null).provisionado).toBeCloseTo(7_000, 6)
    // mês inteiro bate com o total lançado
    expect(calcularProvisao(b, Periodo.de('Mês', '2026-10-05'), null).provisionado).toBeCloseTo(
      42_000,
      6
    )
  })

  it('lote: meses preenchidos para vários clientes; vazios não mexem', () => {
    const b = new Base()
    b.salvarProvisoes('a', 2026, [
      { mes: '2026-09', valor: 1_000 },
      { mes: '2026-10', valor: 1_000 },
    ])
    const n = b.lancarProvisaoEmLote(
      ['a', 'b', 'a'],
      [
        { mes: '2026-10', valor: 3_000 },
        { mes: '2026-11', valor: null },
      ]
    )
    expect(n).toBe(2)
    expect(b.provisoesDe('a').map((p) => [p.mes, p.valor])).toEqual([
      ['2026-09', 1_000],
      ['2026-10', 3_000],
    ])
    expect(b.provisoesDe('b').map((p) => [p.mes, p.valor])).toEqual([['2026-10', 3_000]])
    expect(() => b.lancarProvisaoEmLote([], [{ mes: '2026-10', valor: 1 }])).toThrow()
    expect(() => b.lancarProvisaoEmLote(['a'], [{ mes: '2026-10', valor: null }])).toThrow()
  })

  it('base antiga: provisões no formato R$/dia útil são descartadas ao abrir', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'base-'))
    const caminho = path.join(pasta, 'base.json')
    fs.writeFileSync(
      caminho,
      JSON.stringify({
        versao: 1,
        provisoes: [
          { id: 'x|2026-10-01', cliente: 'x', inicio: '2026-10-01', valor_dia: 10, observacao: '' },
          { id: 'y|2026-10', cliente: 'y', mes: '2026-10', valor: 5, atualizado_em: '' },
        ],
      })
    )
    const b = new Base(caminho)
    expect(b.t.provisoes.map((p) => p.cliente)).toEqual(['y'])
  })

  it('sem provisão: tudo é realizado sem provisão', async () => {
    const { b } = await baseCom()
    const r = calcularProvisao(b, SEMANA, b.cobertura()[1])
    expect(r.provisionado).toBe(0)
    expect(r.atingido).toBeNull()
    expect(r.realizadoSemProvisao).toBeCloseTo(477_787.51, 2)
  })

  it('a provisão continua depois de desfazer uma importação', async () => {
    const cliente = 'cliente-teste'
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'entrada-'))
    const b = new Base()
    for (const a of arquivos(ARQS)) {
      guardarEmEntrada(pasta, a.nome, a.conteudo)
      await b.importar([a])
    }
    b.salvarProvisoes(cliente, 2026, [{ mes: '2026-10', valor: 5_000 }])
    await b.desfazerImportacao(b.t.arquivos.find((a) => a.arquivo === ARQS[2])!.hash, pasta)
    expect(b.provisoesDe(cliente).map((p) => p.valor)).toEqual([5_000])
  })
})

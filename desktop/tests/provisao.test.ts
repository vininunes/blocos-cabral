/** Provisão de clientes: dias úteis, taxa vigente e provisionado x realizado no período. */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Base, guardarEmEntrada } from '../server/relatorio/base'
import { diasUteis, feriados } from '../server/relatorio/dias-uteis'
import { Periodo } from '../server/relatorio/periodo'
import { calcularProvisao, taxaNoDia } from '../server/relatorio/provisao'
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

describe('provisão', () => {
  it('taxa vigente: o último lançamento com início até o dia', () => {
    const b = new Base()
    const ls = b.salvarProvisoes('x', [
      { inicio: '2026-10-14', valor_dia: 20_000, observacao: '' },
      { inicio: '2026-10-01', valor_dia: 10_000, observacao: 'início' },
    ])
    expect(ls.map((l) => l.inicio)).toEqual(['2026-10-01', '2026-10-14'])
    expect(taxaNoDia(ls, '2026-09-30')).toBe(0)
    expect(taxaNoDia(ls, '2026-10-13')).toBe(10_000)
    expect(taxaNoDia(ls, '2026-10-14')).toBe(20_000)
    expect(() =>
      b.salvarProvisoes('x', [{ inicio: '2026-10-01', valor_dia: -1, observacao: '' }])
    ).toThrow()
  })

  it('provisionado x realizado na semana (12/10 é feriado)', async () => {
    const { b } = await baseCom()
    const cliente = maiorClienteDaSemana(b)
    b.salvarProvisoes(cliente, [
      { inicio: '2026-10-01', valor_dia: 10_000, observacao: '' },
      { inicio: '2026-10-14', valor_dia: 20_000, observacao: 'aumento' },
    ])
    const r = calcularProvisao(b, SEMANA, b.cobertura()[1])
    const realCliente = b.notas
      .filter((n) => n.cnpj === cliente && n.data! >= '2026-10-12' && n.data! <= '2026-10-18')
      .reduce((s, n) => s + n.total_nota, 0)
    expect(r.diasUteis).toBe(4)
    expect(r.provisionado).toBe(10_000 + 3 * 20_000) // 13/10 a 10 mil; 14, 15 e 16/10 a 20 mil
    expect(r.realizado).toBeCloseTo(realCliente, 2)
    expect(r.atingido).toBeCloseTo(realCliente / 70_000, 9)
    expect(r.clientesComProvisao).toBe(1)
    const total = b.notas
      .filter((n) => n.data! >= '2026-10-12' && n.data! <= '2026-10-18')
      .reduce((s, n) => s + n.total_nota, 0)
    expect(r.realizado + r.realizadoSemProvisao).toBeCloseTo(total, 2)
    // tabela: primeira linha é a do cliente com provisão
    const l = r.tabela.linhas[0]
    expect(l.slice(2, 5)).toEqual([20_000, 4, 70_000])
    // acumulado: provisão termina em 70 mil; realizado vazio depois de 16/10 (fim dos dados)
    const ultimo = r.acumulado.linhas.at(-1)!
    expect(ultimo[3]).toBe(70_000)
    expect(ultimo[2]).toBeNull()
    expect(r.acumulado.linhas[4][2]).toBeCloseTo(realCliente, 2) // sexta 16/10
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
    b.salvarProvisoes(cliente, [{ inicio: '2026-10-01', valor_dia: 5_000, observacao: '' }])
    await b.desfazerImportacao(b.t.arquivos.find((a) => a.arquivo === ARQS[2])!.hash, pasta)
    expect(b.provisoesDe(cliente).map((p) => p.valor_dia)).toEqual([5_000])
  })
})

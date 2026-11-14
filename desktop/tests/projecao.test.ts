/** Quadro de projeção: rank, totais, metas herdadas, sugestão do valor total e exportação. */
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Base } from '../server/relatorio/base'
import { Relatorio } from '../server/relatorio/metricas'
import { Periodo } from '../server/relatorio/periodo'
import { excelRelatorio } from '../server/relatorio/planilha'
import { gerarPpt } from '../server/relatorio/ppt'
import { calcularProjecao, metaDoMes, rotuloMes } from '../server/relatorio/projecao'
import { baseCom } from './comum'

const HOJE = '2026-11-14'

let base: Base
beforeAll(async () => {
  base = (await baseCom()).b
})

/** Os dois clientes de maior faturamento (chave e nome), sem fixar clientes reais. */
function doisClientes(b: Base) {
  const fat = new Map<string, number>()
  for (const n of b.notas) if (n.cnpj) fat.set(n.cnpj, (fat.get(n.cnpj) ?? 0) + n.total_nota)
  return [...fat.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([k]) => k)
}

describe('projeção', () => {
  it('meses, rótulos e metas herdadas do último mês lançado', () => {
    expect(rotuloMes('2026-11')).toBe('nov/26')
    expect(rotuloMes('2027-01')).toBe('jan/27')
    const metas = [
      { mes: '2026-09', vender_mais: 1, meta_mensal: 2, parar_vender: 3, atualizado_em: '' },
      { mes: '2026-11', vender_mais: 4, meta_mensal: null, parar_vender: 6, atualizado_em: '' },
    ]
    expect(metaDoMes(metas, '2026-11')).toMatchObject({ vender_mais: 4, herdada_de: null })
    expect(metaDoMes(metas, '2026-12')).toMatchObject({ meta_mensal: null, herdada_de: '2026-11' })
    expect(metaDoMes(metas, '2026-10')).toMatchObject({ vender_mais: 1, herdada_de: '2026-09' })
    expect(metaDoMes(metas, '2026-08')).toMatchObject({ vender_mais: null, herdada_de: null })
  })

  it('rank pela projeção do mês atual, totais e valor total digitado', () => {
    const [a, b] = doisClientes(base)
    base.t.provisoes = []
    base.t.metas = []
    base.t.valoresPedido = []
    base.salvarProvisoes(a, 2026, [{ mes: '2026-12', valor: 900 }]) // só no próximo mês
    base.salvarProvisoes(b, 2026, [
      { mes: '2026-11', valor: 500 },
      { mes: '2026-12', valor: 100 },
    ])
    base.salvarProvisoes('fora', 2026, [{ mes: '2026-10', valor: 1 }]) // fora dos dois meses
    base.salvarValorTotalPedido(a, 10_000)
    base.salvarMeta('2026-11', { vender_mais: 4e6, meta_mensal: 3.5e6, parar_vender: 5e6 })

    const p = calcularProjecao(base, HOJE)
    expect(p.meses).toEqual(['2026-11', '2026-12'])
    expect(p.rotulos).toEqual(['nov/26', 'dez/26'])
    expect(p.linhas.map((l) => [l.rank, l.cliente, l.meses])).toEqual([
      [1, b, [500, 100]],
      [2, a, [0, 900]],
    ])
    expect(p.projetadas).toEqual([500, 1000])
    expect(p.concretizadas).toBe(10_000)
    expect(p.linhas[1].valor_total).toBe(10_000)
    expect(p.linhas[0].valor_total).toBeNull()
    // sugestão = maior proposta ou pedido do cliente
    expect(p.linhas[0].sugestao?.valor).toBeGreaterThan(0)
    expect(p.linhas[0].sugestao?.origem).toMatch(/^(proposta|pedido) /)
    expect(p.metas[1]).toMatchObject({ meta_mensal: 3.5e6, herdada_de: '2026-11' })

    // apagar
    base.salvarValorTotalPedido(a, null)
    base.salvarMeta('2026-11', { vender_mais: null, meta_mensal: null, parar_vender: null })
    const q = calcularProjecao(base, HOJE)
    expect(q.concretizadas).toBe(0)
    expect(q.metas[0].vender_mais).toBeNull()
    expect(() => base.salvarMeta('2026-13', {})).toThrow()
    expect(() => base.salvarValorTotalPedido(a, -1)).toThrow()
  })

  it('PowerPoint e Excel com o quadro', async () => {
    base.t.provisoes = []
    base.t.metas = []
    base.t.valoresPedido = []
    // 20 clientes: o quadro passa para um 2º slide
    const chaves = [...new Set(base.notas.map((n) => n.cnpj).filter(Boolean))].slice(0, 20)
    expect(chaves.length).toBe(20)
    chaves.forEach((c, i) => base.salvarProvisoes(c, 2026, [{ mes: '2026-11', valor: 1000 + i }]))
    base.salvarMeta('2026-11', { vender_mais: 4e6, meta_mensal: 3.5e6, parar_vender: 5e6 })
    const p = calcularProjecao(base, HOJE)
    const r = new Relatorio(base, Periodo.de('Semana', '2026-10-16'), 'Todos')

    const sem = await JSZip.loadAsync(await gerarPpt(r))
    const com = await JSZip.loadAsync(await gerarPpt(r, p))
    const slides = (z: JSZip) =>
      Object.keys(z.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    expect(slides(com).length - slides(sem).length).toBe(2)
    const textos = await Promise.all(slides(com).map((n) => com.file(n)!.async('string')))
    expect(textos.some((t) => t.includes('Meta de vendas e projeção (2/2)'))).toBe(true)
    expect(textos.some((t) => t.includes('VENDAS PROJETADAS'))).toBe(true)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load((await excelRelatorio(r.tabelasExcel(), p)) as unknown as ArrayBuffer)
    const ws = wb.getWorksheet('Projeção')!
    expect(ws.getCell('B1').value).toBe('META DE VENDAS')
    expect(ws.getCell('B2').value).toBe('Vender Mais')
    expect(ws.getCell('D2').value).toBe(4e6)
    expect(ws.getCell('E3').value).toBe(3.5e6) // dezembro herda as metas de novembro
    expect(ws.getCell('D5').value).toBe('nov/26')
    expect(ws.getCell('A6').value).toBe(1)
    expect(ws.getCell('D6').value).toBe(1019) // maior projeção primeiro
    const ultima = ws.rowCount
    expect(ws.getCell(`B${ultima - 1}`).value).toBe('VENDAS PROJETADAS')
    expect(ws.getCell(`D${ultima - 1}`).value).toBe(chaves.reduce((s, _, i) => s + 1000 + i, 0))
    expect(ws.getCell(`B${ultima}`).value).toBe('VENDAS CONCRETIZADAS')

    // sem projeção nem metas: nada de aba/slide
    base.t.provisoes = []
    base.t.metas = []
    const vazio = calcularProjecao(base, HOJE)
    const wb2 = new ExcelJS.Workbook()
    await wb2.xlsx.load((await excelRelatorio(r.tabelasExcel(), vazio)) as unknown as ArrayBuffer)
    expect(wb2.getWorksheet('Projeção')).toBeUndefined()
    expect(slides(await JSZip.loadAsync(await gerarPpt(r, vazio))).length).toBe(slides(sem).length)
  })
})

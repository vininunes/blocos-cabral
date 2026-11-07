/** As listas da aba Indicadores batem com os indicadores calculados. */
import { describe, expect, it } from 'vitest'

import { Relatorio } from '../server/relatorio/metricas'
import { Periodo } from '../server/relatorio/periodo'
import { baseCom } from './comum'

describe('valores usados nos indicadores', () => {
  it('soma e contagem de cada lista = indicador', async () => {
    const { b } = await baseCom()
    const rel = new Relatorio(b, Periodo.de('Mês', '2026-10-16'))
    const kpi = (n: string) => rel.kpis().find((k) => k.nome === n)!.atual
    const bases = new Map(rel.basesIndicadores().map((x) => [x.titulo, x.tabela]))
    const soma = (t: string) => {
      const tab = bases.get(t)!
      const j = tab.colunas.indexOf('Valor')
      return tab.linhas.reduce((s, l) => s + Number(l[j] ?? 0), 0)
    }
    const qtd = (t: string) => bases.get(t)!.linhas.length

    expect(soma('Notas emitidas')).toBeCloseTo(kpi('Faturamento (notas)'), 2)
    expect(qtd('Notas emitidas')).toBe(kpi('Notas emitidas'))
    expect(soma('Pedidos entregues')).toBeCloseTo(kpi('Entregue (pedidos)'), 2)
    expect(qtd('Pedidos entregues')).toBe(kpi('Pedidos entregues'))
    expect(soma('Vendas aprovadas')).toBeCloseTo(kpi('Vendas aprovadas'), 2)
    expect(qtd('Propostas emitidas')).toBe(kpi('Propostas emitidas'))
    expect(qtd('Cancelamentos')).toBe(kpi('Propostas canceladas'))
    expect(soma('Carteira em processo')).toBeCloseTo(kpi('Carteira em processo'), 2)
    expect(soma('Aguardando nota')).toBeCloseTo(kpi('Aguardando nota'), 2)
    // lista de notas sem colunas vazias (Motivo/Comentário)
    expect(bases.get('Notas emitidas')!.colunas).not.toContain('Comentário')
  })

  it('relatório focado num status: a lista do status', async () => {
    const { b } = await baseCom()
    const rel = new Relatorio(b, Periodo.de('Mês', '2026-10-16'), 'Entregue')
    expect(rel.basesIndicadores().map((x) => x.titulo)).toEqual(['Entregue', 'Aguardando nota'])
  })
})

/** Testes que não dependem dos dados reais: datas, períodos, dias úteis e formatação. */
import { describe, expect, it } from 'vitest'

import { diasUteis, feriados } from '../server/relatorio/dias-uteis'
import { comparacao, MESMA_DATA, Periodo } from '../server/relatorio/periodo'
import { fmtMoeda, fmtQtd, numBr } from '../server/relatorio/utils'

describe('sem dados reais', () => {
  it('dias úteis e feriados nacionais', () => {
    expect(diasUteis('2026-10-01', '2026-10-31').length).toBe(21)
    expect(feriados(2026).has('2026-04-03')).toBe(true)
  })

  it('períodos e comparação até a mesma data', () => {
    const [a, b] = comparacao(Periodo.de('Mês', '2026-10-01'), MESMA_DATA, '2026-10-16')
    expect([a.inicio, a.fim, b!.inicio, b!.fim]).toEqual([
      '2026-10-01',
      '2026-10-16',
      '2026-09-01',
      '2026-09-16',
    ])
  })

  it('números no padrão brasileiro', () => {
    expect(numBr('5.050,00')).toBe(5050)
    expect(fmtMoeda(138666.30000000002)).toBe('R$ 138.666,30')
    expect(fmtQtd(0.1)).toBe('0,10')
  })
})

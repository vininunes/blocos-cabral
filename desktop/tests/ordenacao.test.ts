/** Ordenação das tabelas feitas à mão (mesmas regras da tabela padrão do relatório). */
import { describe, expect, it } from 'vitest'

import {
  ordenarPor,
  primeiroSentido,
} from '../src/atomic/features/relatorio-tabela/hooks/use-ordenacao'

describe('ordenação de tabelas', () => {
  it('números, texto (pt-BR, sem acento/caixa) e datas; vazios sempre no fim', () => {
    const id = <T>(x: T) => x as never
    expect(ordenarPor([3, null, 10, 1], id, 'asc')).toEqual([1, 3, 10, null])
    expect(ordenarPor([3, null, 10, 1], id, 'desc')).toEqual([10, 3, 1, null])
    expect(ordenarPor(['b', 'Á', '', 'a'], id, 'asc')).toEqual(['Á', 'a', 'b', ''])
    expect(ordenarPor(['pedido 10', 'pedido 9'], id, 'asc')).toEqual(['pedido 9', 'pedido 10'])
    expect(ordenarPor(['2026-01-02', '2025-12-31'], id, 'desc')).toEqual([
      '2026-01-02',
      '2025-12-31',
    ])
  })

  it('estável: empates mantêm a ordem original', () => {
    const ls = [
      { k: 'a', v: 1 },
      { k: 'b', v: 2 },
      { k: 'c', v: 1 },
    ]
    expect(ordenarPor(ls, (x) => x.v, 'asc').map((x) => x.k)).toEqual(['a', 'c', 'b'])
    expect(ordenarPor(ls, (x) => x.v, 'desc').map((x) => x.k)).toEqual(['b', 'a', 'c'])
  })

  it('1º clique: números e datas do maior; texto de A a Z', () => {
    expect(primeiroSentido([null, 5])).toBe('desc')
    expect(primeiroSentido(['', '2026-11-06'])).toBe('desc')
    expect(primeiroSentido(['Cliente'])).toBe('asc')
    expect(primeiroSentido([])).toBe('asc')
  })
})

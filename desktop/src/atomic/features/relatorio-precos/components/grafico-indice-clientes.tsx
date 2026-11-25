import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'
import type { ClientePreco } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtPct, fmtSinal } from '@server/relatorio/utils'

import { Legenda } from '@/atomic/features/relatorio-graficos/components/legenda'
import { PlotBox } from '@/atomic/features/relatorio-graficos/components/plot-box'

import {
  COR,
  EIXO,
  ESTILO,
  GRID,
  TOOLTIP,
} from '@/atomic/features/relatorio-graficos/constants/grafico'

import { cortar, margemRotulos } from '@/atomic/features/relatorio-graficos/helpers/rotulo'

type Item = ClientePreco & { indice: number }

/**
 * Índice de preço por cliente: quanto ele pagou acima (verde) ou abaixo (vermelho) do preço
 * médio, nos produtos que outros clientes também compraram. Valores no ponteiro.
 */
export function GraficoIndiceClientes({ clientes }: { clientes: Item[] }) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!clientes.length) return null
      const dominio = clientes.map((c) => c.chave)
      const nomes = new Map(clientes.map((c) => [c.chave, c.cliente]))
      const maior = Math.max(0.02, ...clientes.map((c) => Math.abs(c.indice)))
      return Plot.plot({
        width,
        height,
        marginTop: 8,
        marginRight: 56,
        marginBottom: 8,
        marginLeft: margemRotulos([...nomes.values()], width, 32),
        style: ESTILO,
        x: { axis: null, domain: [-maior * 1.15, maior * 1.15] },
        y: {
          domain: dominio,
          label: null,
          tickSize: 0,
          padding: 0.3,
          tickFormat: (k: string) => cortar(nomes.get(k) ?? k, 32),
        },
        marks: [
          Plot.gridX(GRID),
          Plot.ruleX([0], { ...EIXO, strokeOpacity: 0.8 }),
          Plot.barX(clientes, {
            x: 'indice',
            y: 'chave',
            fill: (c: Item) => (c.indice < 0 ? COR.vermelho : COR.verde),
            rx: 2,
          }),
          // rótulo na ponta da barra, do lado dela
          Plot.text(
            clientes.filter((c) => c.indice < 0),
            {
              x: 'indice',
              y: 'chave',
              text: (c: Item) => fmtPct(c.indice, 1, true),
              textAnchor: 'end',
              dx: -4,
              fill: 'currentColor',
            }
          ),
          Plot.text(
            clientes.filter((c) => c.indice >= 0),
            {
              x: 'indice',
              y: 'chave',
              text: (c: Item) => fmtPct(c.indice, 1, true),
              textAnchor: 'start',
              dx: 4,
              fill: 'currentColor',
            }
          ),
          Plot.tip(
            clientes,
            Plot.pointerY({
              x: 'indice',
              y: 'chave',
              title: (c: Item) =>
                [
                  c.cliente,
                  `Vs. média: ${fmtPct(c.indice, 1, true)}`,
                  `Diferença: ${fmtSinal(c.diferenca, (v) => fmtMoeda(v))}`,
                  `Comprado (comparável): ${fmtMoeda(c.valorComparavel)} de ${fmtMoeda(c.valor)}`,
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [clientes]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda
        itens={[
          { nome: 'Pagou abaixo da média', cor: COR.vermelho },
          { nome: 'Pagou acima da média', cor: COR.verde },
        ]}
      />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

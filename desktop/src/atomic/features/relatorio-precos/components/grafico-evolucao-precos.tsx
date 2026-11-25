import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'
import { fmtNum, fmtPct } from '@server/relatorio/utils'

import { PlotBox } from '@/atomic/features/relatorio-graficos/components/plot-box'

import { COR, ESTILO, GRID, TOOLTIP } from '@/atomic/features/relatorio-graficos/constants/grafico'

export type PontoIndice = {
  rotulo: string
  indice: number
  variacao: number | null
  produtos: number
}

/**
 * Índice de preços encadeado (1º retrato = 100): a cada retrato, a variação dos produtos que
 * estavam também no anterior, pesada pela quantidade do retrato.
 */
export function GraficoIndicePrecos({ pontos }: { pontos: PontoIndice[] }) {
  const build = useCallback(
    (width: number, height: number) => {
      if (pontos.length < 2) return null
      const dominio = pontos.map((p) => p.rotulo)
      return Plot.plot({
        width,
        height,
        marginTop: 20,
        marginRight: 24,
        marginBottom: 28,
        marginLeft: 44,
        style: ESTILO,
        x: { type: 'point', domain: dominio, label: null, padding: 0.3 },
        y: { label: null, nice: true, tickFormat: (v: number) => fmtNum(v, 0), ticks: 5 },
        marks: [
          Plot.gridY({ ...GRID, ticks: 5 }),
          Plot.ruleY([100], { stroke: 'currentColor', strokeOpacity: 0.4, strokeDasharray: '4 3' }),
          Plot.line(pontos, { x: 'rotulo', y: 'indice', stroke: COR.azul, strokeWidth: 2 }),
          Plot.dot(pontos, { x: 'rotulo', y: 'indice', fill: COR.azul, r: 3.5 }),
          Plot.text(pontos, {
            x: 'rotulo',
            y: 'indice',
            text: (p: PontoIndice) => fmtNum(p.indice, 1),
            dy: -10,
            fill: 'currentColor',
          }),
          Plot.tip(
            pontos,
            Plot.pointerX({
              x: 'rotulo',
              y: 'indice',
              title: (p: PontoIndice) =>
                [
                  p.rotulo,
                  `Índice: ${fmtNum(p.indice, 1)}`,
                  ...(p.variacao === null
                    ? ['Base do índice']
                    : [
                        `Variação vs. anterior: ${fmtPct(p.variacao, 1, true)}`,
                        `${fmtNum(p.produtos)} produtos em comum`,
                      ]),
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [pontos]
  )
  return <PlotBox build={build} />
}

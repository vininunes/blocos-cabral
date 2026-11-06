import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { COR, EIXO, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { cortar, margemRotulos } from '../helpers/rotulo'
import { Legenda } from './legenda'
import { PlotBox } from './plot-box'

export type ItemRanking = { rotulo: string; valor: number; anterior: number | null }

/**
 * Ranking em barras horizontais: barra = período A; traço = período B (quando há comparação),
 * para comparar sem dobrar o número de barras. Valor completo no tooltip.
 */
export function GraficoRanking({
  itens,
  nomeA,
  nomeB,
  formatar,
  formatarCurto = formatar,
  cor = COR.azul,
}: {
  itens: ItemRanking[]
  nomeA: string
  nomeB?: string | null
  formatar: (v: number) => string
  formatarCurto?: (v: number) => string
  cor?: string
}) {
  const comB = !!nomeB && itens.some((i) => i.anterior !== null)
  const build = useCallback(
    (width: number, height: number) => {
      if (!itens.length) return null
      const dominio = itens.map((i) => i.rotulo)
      const marginLeft = margemRotulos(dominio, width, 36)
      const comAnterior = itens.filter((i) => i.anterior !== null)
      return Plot.plot({
        width,
        height,
        marginTop: 8,
        marginRight: 72,
        marginBottom: 8,
        marginLeft,
        style: ESTILO,
        x: { axis: null, nice: true },
        y: {
          domain: dominio,
          label: null,
          tickSize: 0,
          padding: 0.3,
          tickFormat: (r: string) => cortar(r, 36),
        },
        marks: [
          Plot.gridX(GRID),
          Plot.ruleX([0], EIXO),
          Plot.barX(itens, { x: 'valor', y: 'rotulo', fill: cor, rx: 2 }),
          ...(comB
            ? [
                Plot.tickX(comAnterior, {
                  x: 'anterior',
                  y: 'rotulo',
                  stroke: COR.cinza,
                  strokeWidth: 3,
                  inset: -3,
                }),
              ]
            : []),
          // valor colado na ponta da barra (o traço de B pode ficar antes ou depois dele)
          Plot.text(itens, {
            x: 'valor',
            y: 'rotulo',
            text: (i: ItemRanking) => formatarCurto(i.valor),
            textAnchor: 'start',
            dx: 6,
            fill: 'currentColor',
          }),
          Plot.tip(
            itens,
            Plot.pointerY({
              x: 'valor',
              y: 'rotulo',
              title: (i: ItemRanking) =>
                [
                  i.rotulo,
                  `${nomeA}: ${formatar(i.valor)}`,
                  ...(comB && i.anterior !== null ? [`${nomeB}: ${formatar(i.anterior)}`] : []),
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [itens, nomeA, nomeB, comB, formatar, formatarCurto, cor]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      {comB && (
        <Legenda
          itens={[
            { nome: nomeA, cor },
            { nome: `${nomeB} (traço)`, cor: COR.cinza },
          ]}
        />
      )}
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

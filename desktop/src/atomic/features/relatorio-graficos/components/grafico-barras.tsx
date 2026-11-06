import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { COR, EIXO, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { cortar, margemRotulos } from '../helpers/rotulo'
import { PlotBox } from './plot-box'

export type Barra = { rotulo: string; valor: number }

/**
 * Barras (horizontais ou verticais) com o valor resumido na ponta e o valor completo no
 * ponteiro.
 */
export function GraficoBarras({
  barras,
  formatar,
  formatarCurto = formatar,
  cor = COR.azul,
  horizontal = true,
}: {
  barras: Barra[]
  formatar: (v: number) => string
  formatarCurto?: (v: number) => string
  cor?: string
  horizontal?: boolean
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!barras.length) return null
      const dominio = barras.map((b) => b.rotulo)
      if (horizontal) {
        const marginLeft = margemRotulos(dominio, width)
        return Plot.plot({
          width,
          height,
          marginTop: 18,
          marginRight: 64,
          marginBottom: 8,
          marginLeft,
          style: ESTILO,
          x: { axis: null, nice: true },
          y: {
            domain: dominio,
            label: null,
            tickSize: 0,
            padding: 0.25,
            tickFormat: (r: string) => cortar(r, 34),
          },
          marks: [
            Plot.gridX(GRID),
            Plot.ruleX([0], EIXO),
            Plot.barX(barras, { x: 'valor', y: 'rotulo', fill: cor, rx: 2 }),
            Plot.barX(
              barras,
              Plot.pointerY({
                x: 'valor',
                y: 'rotulo',
                fill: 'none',
                stroke: 'var(--foreground)',
                strokeWidth: 1.5,
                rx: 2,
              })
            ),
            Plot.text(barras, {
              x: 'valor',
              y: 'rotulo',
              text: (d: Barra) => formatarCurto(d.valor),
              textAnchor: 'start',
              dx: 4,
              fill: 'currentColor',
            }),
            Plot.tip(
              barras,
              Plot.pointerY({
                x: 'valor',
                y: 'rotulo',
                title: (d: Barra) => `${d.rotulo}\n${formatar(d.valor)}`,
                ...TOOLTIP,
              })
            ),
          ],
        })
      }
      return Plot.plot({
        width,
        height,
        marginTop: 22,
        marginRight: 8,
        marginBottom: 22,
        marginLeft: 8,
        style: ESTILO,
        y: { axis: null, nice: true },
        x: { domain: dominio, label: null, tickSize: 0, padding: 0.25 },
        marks: [
          Plot.gridY(GRID),
          Plot.ruleY([0], EIXO),
          Plot.barY(barras, { x: 'rotulo', y: 'valor', fill: cor, rx: 2 }),
          Plot.barY(
            barras,
            Plot.pointerX({
              x: 'rotulo',
              y: 'valor',
              fill: 'none',
              stroke: 'var(--foreground)',
              strokeWidth: 1.5,
              rx: 2,
            })
          ),
          Plot.text(barras, {
            x: 'rotulo',
            y: 'valor',
            text: (d: Barra) => (d.valor ? formatarCurto(d.valor) : ''),
            dy: -6,
            lineAnchor: 'bottom',
            fill: 'currentColor',
          }),
          Plot.tip(
            barras,
            Plot.pointerX({
              x: 'rotulo',
              y: 'valor',
              title: (d: Barra) => `${d.rotulo}\n${formatar(d.valor)}`,
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [barras, formatar, formatarCurto, cor, horizontal]
  )
  return <PlotBox build={build} />
}

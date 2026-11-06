import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { COR, EIXO, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { Legenda } from './legenda'
import { PlotBox } from './plot-box'

export type ItemPareto = { nome: string; valor: number; acumulado: number; classe: 'A' | 'B' | 'C' }

const CORES = { A: COR.verde, B: COR.azul, C: '#a3a9b5' }

/**
 * Curva ABC (Pareto): barras do faturamento por cliente/grupo (cor = classe) e a linha do
 * faturamento acumulado, com as marcas de 80% (A) e 95% (B). Nomes no tooltip.
 */
export function GraficoPareto({
  itens,
  formatar,
  formatarPct,
}: {
  itens: ItemPareto[]
  formatar: (v: number) => string
  formatarPct: (v: number) => string
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!itens.length) return null
      const max = Math.max(...itens.map((i) => i.valor))
      // o acumulado (0–100%) é desenhado na mesma escala das barras: 100% = maior barra
      const escala = (p: number) => p * max
      const dominio = itens.map((_, i) => i)
      return Plot.plot({
        width,
        height,
        marginTop: 14,
        marginRight: 44,
        marginBottom: 10,
        marginLeft: 8,
        style: ESTILO,
        x: { domain: dominio, axis: null, padding: 0.15 },
        y: { domain: [0, max], axis: null },
        marks: [
          Plot.gridY([0.25, 0.5, 0.75, 1].map(escala), GRID),
          Plot.ruleY([0], EIXO),
          Plot.barY(itens, {
            x: (_: ItemPareto, i: number) => i,
            y: 'valor',
            fill: (d: ItemPareto) => CORES[d.classe],
            rx: 1,
          }),
          Plot.ruleY([0.8, 0.95].map(escala), {
            stroke: 'currentColor',
            strokeOpacity: 0.5,
            strokeDasharray: '5 4',
          }),
          Plot.text([0.8, 0.95], {
            y: escala,
            text: (p: number) => formatarPct(p),
            frameAnchor: 'right',
            textAnchor: 'start',
            dx: 6,
            fill: 'currentColor',
          }),
          Plot.line(itens, {
            x: (_: ItemPareto, i: number) => i,
            y: (d: ItemPareto) => escala(d.acumulado),
            stroke: COR.grafite,
            strokeWidth: 2,
          }),
          Plot.tip(
            itens,
            Plot.pointerX({
              x: (_: ItemPareto, i: number) => i,
              y: 'valor',
              title: (d: ItemPareto) =>
                [
                  d.nome,
                  `Classe ${d.classe} · ${formatar(d.valor)}`,
                  `Acumulado: ${formatarPct(d.acumulado)}`,
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [itens, formatar, formatarPct]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda
        itens={[
          { nome: 'A', cor: CORES.A },
          { nome: 'B', cor: CORES.B },
          { nome: 'C', cor: CORES.C },
          { nome: 'Acumulado', cor: COR.grafite },
        ]}
      />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

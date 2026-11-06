import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { COR, EIXO, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { Legenda } from './legenda'
import { PlotBox } from './plot-box'

export type PontoAcumulado = { dia: number; rotulo: string; periodo: string; valor: number }

const MIN_TICK = 34

/**
 * Acumulado dia a dia: A (azul, contínua) x B (cinza, tracejada), alinhados pelo dia do
 * período — gráfico de linha com duas séries.
 */
export function GraficoAcumulado({
  pontos,
  nomeA,
  nomeB,
  dias,
  formatar,
  formatarEixo,
}: {
  pontos: PontoAcumulado[]
  nomeA: string
  nomeB: string
  /** Rótulo de cada dia do eixo (1..n ou Seg..Dom). */
  dias: string[]
  formatar: (v: number) => string
  formatarEixo: (v: number) => string
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!pontos.length) return null
      const marginLeft = 64
      const passo = Math.max(
        1,
        Math.ceil(dias.length / Math.max(1, Math.floor((width - marginLeft) / MIN_TICK)))
      )
      const yTicks = Math.max(2, Math.floor((height - 40) / 32))
      const a = pontos.filter((p) => p.periodo === nomeA)
      const b = pontos.filter((p) => p.periodo === nomeB)
      return Plot.plot({
        width,
        height,
        marginTop: 20,
        marginRight: 12,
        marginBottom: 22,
        marginLeft,
        style: ESTILO,
        x: {
          domain: [1, Math.max(dias.length, 2)],
          label: null,
          ticks: dias.map((_, i) => i + 1).filter((d) => (d - 1) % passo === 0),
          tickFormat: (d: number) => dias[d - 1] ?? '',
          tickSize: 0,
        },
        y: { label: null, nice: true, ticks: yTicks, tickFormat: formatarEixo, zero: true },
        marks: [
          Plot.gridY({ ticks: yTicks, ...GRID }),
          Plot.ruleY([0], EIXO),
          Plot.line(b, {
            x: 'dia',
            y: 'valor',
            stroke: COR.cinza,
            strokeWidth: 2,
            strokeDasharray: '6 4',
          }),
          Plot.line(a, { x: 'dia', y: 'valor', stroke: COR.azul, strokeWidth: 2.5 }),
          ...(dias.length <= 31
            ? [Plot.dot(a, { x: 'dia', y: 'valor', r: 2.5, fill: COR.azul })]
            : []),
          Plot.ruleX(
            pontos,
            Plot.pointerX({ x: 'dia', stroke: 'currentColor', strokeOpacity: 0.5 })
          ),
          Plot.dot(
            pontos,
            Plot.pointerX({
              x: 'dia',
              y: 'valor',
              r: 4.5,
              stroke: 'white',
              strokeWidth: 1,
              fill: (d: PontoAcumulado) => (d.periodo === nomeA ? COR.azul : COR.cinza),
            })
          ),
          Plot.tip(
            a,
            Plot.pointerX({
              x: 'dia',
              y: 'valor',
              title: (d: PontoAcumulado) => {
                const vb = b.find((x) => x.dia === d.dia)
                return [
                  `Dia ${d.rotulo}`,
                  `${nomeA}: ${formatar(d.valor)}`,
                  ...(vb ? [`${nomeB}: ${formatar(vb.valor)}`] : []),
                ].join('\n')
              },
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [pontos, nomeA, nomeB, dias, formatar, formatarEixo]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda
        itens={[
          { nome: nomeA, cor: COR.azul },
          { nome: nomeB, cor: COR.cinza, tracejado: true },
        ]}
      />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

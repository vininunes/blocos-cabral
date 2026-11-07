import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'
import { fmtPct } from '@server/relatorio/utils'

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

export type ItemProvisao = { cliente: string; provisao: number; realizado: number }

const MARGEM_TOPO = 8
const MARGEM_BAIXO = 8
const PADDING = 0.25

/**
 * Provisão x realizado por cliente: duas barras por cliente (realizado em cima, provisão embaixo),
 * nas cores do acumulado. Valores e % atingido no tooltip.
 */
export function GraficoProvisaoClientes({
  itens,
  formatar,
}: {
  itens: ItemProvisao[]
  formatar: (v: number) => string
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!itens.length) return null
      const dominio = itens.map((i) => i.cliente)
      // meia faixa para cada série: as duas barras dividem a altura da faixa do cliente
      const faixa = ((height - MARGEM_TOPO - MARGEM_BAIXO) / itens.length) * (1 - PADDING)
      const meia = Math.max(1, faixa / 2)
      return Plot.plot({
        width,
        height,
        marginTop: MARGEM_TOPO,
        marginRight: 72,
        marginBottom: MARGEM_BAIXO,
        marginLeft: margemRotulos(dominio, width, 30),
        style: ESTILO,
        x: { axis: null, nice: true },
        y: {
          domain: dominio,
          label: null,
          tickSize: 0,
          padding: PADDING,
          tickFormat: (r: string) => cortar(r, 30),
        },
        marks: [
          Plot.gridX(GRID),
          Plot.ruleX([0], EIXO),
          Plot.barX(itens, {
            x: 'realizado',
            y: 'cliente',
            fill: COR.azul,
            insetBottom: meia,
            rx: 2,
          }),
          Plot.barX(itens, {
            x: 'provisao',
            y: 'cliente',
            fill: COR.cinza,
            insetTop: meia,
            rx: 2,
          }),
          Plot.text(itens, {
            x: (i: ItemProvisao) => Math.max(i.realizado, i.provisao),
            y: 'cliente',
            text: (i: ItemProvisao) => (i.provisao ? fmtPct(i.realizado / i.provisao) : ''),
            textAnchor: 'start',
            dx: 6,
            fill: 'currentColor',
          }),
          Plot.tip(
            itens,
            Plot.pointerY({
              x: (i: ItemProvisao) => Math.max(i.realizado, i.provisao),
              y: 'cliente',
              title: (i: ItemProvisao) =>
                [
                  i.cliente,
                  `Realizado: ${formatar(i.realizado)}`,
                  `Provisão: ${formatar(i.provisao)}`,
                  ...(i.provisao ? [`Atingido: ${fmtPct(i.realizado / i.provisao)}`] : []),
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [itens, formatar]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda
        itens={[
          { nome: 'Realizado', cor: COR.azul },
          { nome: 'Provisão', cor: COR.cinza },
        ]}
      />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

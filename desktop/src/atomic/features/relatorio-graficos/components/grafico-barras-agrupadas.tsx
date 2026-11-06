import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { EIXO, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { Legenda } from './legenda'
import { PlotBox } from './plot-box'

type Ponto = { rotulo: string; serie: string; valor: number }

/** Barras lado a lado por categoria (ex.: Faturado x Entregue por semana). */
export function GraficoBarrasAgrupadas({
  categorias,
  series,
  formatar,
  formatarCurto = formatar,
}: {
  categorias: string[]
  series: { nome: string; cor: string; valores: number[] }[]
  formatar: (v: number) => string
  formatarCurto?: (v: number) => string
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!categorias.length) return null
      const dados: Ponto[] = series.flatMap((s) =>
        categorias.map((rotulo, i) => ({ rotulo, serie: s.nome, valor: s.valores[i] ?? 0 }))
      )
      const nomes = series.map((s) => s.nome)
      const cores = series.map((s) => s.cor)
      return Plot.plot({
        width,
        height,
        marginTop: 22,
        marginRight: 8,
        marginBottom: 22,
        marginLeft: 8,
        style: ESTILO,
        fx: { domain: categorias, label: null, padding: 0.15, tickSize: 0 },
        x: { domain: nomes, axis: null, padding: 0.08 },
        y: { axis: null, nice: true },
        color: { domain: nomes, range: cores },
        marks: [
          Plot.gridY(GRID),
          Plot.ruleY([0], EIXO),
          Plot.barY(dados, { fx: 'rotulo', x: 'serie', y: 'valor', fill: 'serie', rx: 2 }),
          Plot.text(dados, {
            fx: 'rotulo',
            x: 'serie',
            y: 'valor',
            text: (d: Ponto) => (d.valor ? formatarCurto(d.valor) : ''),
            dy: -6,
            lineAnchor: 'bottom',
            fill: 'currentColor',
            fontSize: categorias.length > 8 ? 8 : 10,
          }),
          Plot.tip(
            dados,
            Plot.pointerX({
              fx: 'rotulo',
              x: 'serie',
              y: 'valor',
              title: (d: Ponto) => `${d.rotulo}\n${d.serie}: ${formatar(d.valor)}`,
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [categorias, series, formatar, formatarCurto]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda itens={series.map((s) => ({ nome: s.nome, cor: s.cor }))} />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

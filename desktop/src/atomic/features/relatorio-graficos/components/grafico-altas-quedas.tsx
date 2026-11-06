import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'

import { COR, ESTILO, GRID, TOOLTIP } from '../constants/grafico'
import { cortar, margemRotulos } from '../helpers/rotulo'
import { PlotBox } from './plot-box'

/**
 * Rótulo de valor: balão sem borda e sem a seta do tooltip, com o mesmo fundo do quadro do
 * gráfico (cor na classe, em styles/relatorio.css), para cobrir a grade atrás do texto.
 */
const ROTULO = {
  className: 'plot-rotulo-valor',
  fill: 'var(--background)',
  stroke: 'none',
  pointerSize: 0,
  dx: 0,
  textPadding: 4,
  fontSize: 10,
  fontWeight: 600,
  pathFilter: 'none',
}

export type Movimento = {
  nome: string
  movimento: 'Alta' | 'Queda'
  valorA: number
  valorB: number
  diferenca: number
  variacao: number | null
}

/** Barras divergentes da diferença A - B: quem mais cresceu (verde) e quem mais caiu (vermelho). */
export function GraficoAltasQuedas({
  movimentos,
  nomeA,
  nomeB,
  formatar,
  formatarCurto,
  formatarPct,
  inverso = false,
}: {
  movimentos: Movimento[]
  nomeA: string
  nomeB: string
  formatar: (v: number) => string
  formatarCurto: (v: number) => string
  formatarPct: (v: number) => string
  /** Subir é ruim (ex.: cancelamentos): alta em vermelho, queda em verde. */
  inverso?: boolean
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!movimentos.length) return null
      const nomes = movimentos.map((m) => m.nome)
      const marginLeft = margemRotulos(nomes, width, 30)
      const max = Math.max(...movimentos.map((m) => Math.abs(m.diferenca)))
      const sinal = (v: number) => (v > 0 ? '+' : '-') + formatarCurto(Math.abs(v))
      return Plot.plot({
        width,
        height,
        marginTop: 20,
        // à direita, espaço para o rótulo da maior alta; à esquerda, o domínio vai além
        // da maior queda para o rótulo dela não encostar nos nomes
        marginRight: 72,
        marginBottom: 8,
        marginLeft,
        style: ESTILO,
        x: { axis: null, domain: [-max * 1.6, max] },
        y: {
          domain: nomes,
          label: null,
          tickSize: 0,
          padding: 0.25,
          tickFormat: (n: string) => cortar(n, 30),
        },
        marks: [
          Plot.gridY(nomes, GRID),
          Plot.barX(movimentos, {
            x: 'diferenca',
            y: 'nome',
            rx: 2,
            fill: (d: Movimento) =>
              (d.movimento === 'Alta') !== inverso ? COR.verde : COR.vermelho,
          }),
          Plot.ruleX([0], { stroke: COR.grafite }),
          // rótulos com fundo (balão sem seta) na ponta de cada barra: legíveis sobre a grade
          Plot.tip(movimentos, {
            x: 'diferenca',
            y: 'nome',
            title: (d: Movimento) => sinal(d.diferenca),
            filter: (d: Movimento) => d.diferenca > 0,
            anchor: 'left',
            ...ROTULO,
          }),
          Plot.tip(movimentos, {
            x: 'diferenca',
            y: 'nome',
            title: (d: Movimento) => sinal(d.diferenca),
            filter: (d: Movimento) => d.diferenca < 0,
            anchor: 'right',
            ...ROTULO,
          }),
          Plot.tip(
            movimentos,
            Plot.pointerY({
              x: 'diferenca',
              y: 'nome',
              title: (d: Movimento) =>
                [
                  d.nome,
                  `${nomeA}: ${formatar(d.valorA)}`,
                  `${nomeB}: ${formatar(d.valorB)}`,
                  `Diferença: ${(d.diferenca > 0 ? '+' : '-') + formatar(Math.abs(d.diferenca))} (${d.variacao === null ? 'novo' : formatarPct(d.variacao)})`,
                ].join('\n'),
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [movimentos, nomeA, nomeB, formatar, formatarCurto, formatarPct, inverso]
  )
  return <PlotBox build={build} />
}

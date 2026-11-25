import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'
import type { PontoPreco, ProdutoPreco } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtPct, fmtQtd } from '@server/relatorio/utils'

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

import { chaveProduto, rotuloProduto } from '../helpers/precos'

/**
 * Dispersão de preços por produto: cada ponto é um cliente, na distância (%) do preço médio do
 * produto (a linha do zero). Em % para comparar produtos de preços muito diferentes (bloco a
 * R$ 5 e piso a R$ 60/m²); o preço em R$ fica no ponteiro. Tamanho do ponto = quantidade.
 */
export function GraficoDispersaoPrecos({
  produtos,
  pontos,
}: {
  produtos: ProdutoPreco[]
  pontos: PontoPreco[]
}) {
  const build = useCallback(
    (width: number, height: number) => {
      if (!produtos.length) return null
      const dominio = produtos.map(chaveProduto)
      const rotulos = new Map(produtos.map((p) => [chaveProduto(p), rotuloProduto(p)]))
      const medio = new Map(produtos.map((p) => [chaveProduto(p), p]))
      const dentro = new Set(dominio)
      const pts = pontos.filter((p) => dentro.has(p.codigo))
      const faixa = produtos.map((p) => ({
        k: chaveProduto(p),
        min: p.minimo / p.preco - 1,
        max: p.maximo / p.preco - 1,
      }))
      const maior = Math.max(0.05, ...pts.map((p) => Math.abs(p.desvio)))
      return Plot.plot({
        width,
        height,
        marginTop: 8,
        marginRight: 24,
        marginBottom: 28,
        marginLeft: margemRotulos([...rotulos.values()], width, 40),
        style: ESTILO,
        x: {
          domain: [-maior * 1.1, maior * 1.1],
          tickFormat: (v: number) => fmtPct(v, 0, true),
          label: null,
          ticks: 6,
        },
        y: {
          domain: dominio,
          label: null,
          tickSize: 0,
          padding: 0.4,
          tickFormat: (k: string) => cortar(rotulos.get(k) ?? k, 40),
        },
        r: { range: [2.5, 9] },
        marks: [
          Plot.gridX({ ...GRID, ticks: 6 }),
          Plot.ruleX([0], { ...EIXO, strokeOpacity: 0.8 }),
          Plot.ruleY(faixa, {
            y: 'k',
            x1: 'min',
            x2: 'max',
            stroke: 'currentColor',
            strokeOpacity: 0.25,
            strokeWidth: 3,
          }),
          Plot.dot(pts, {
            x: 'desvio',
            y: 'codigo',
            r: 'qtd',
            fill: (p: PontoPreco) => (p.desvio < -0.0005 ? COR.vermelho : COR.verde),
            fillOpacity: 0.75,
            stroke: 'var(--background)',
            strokeWidth: 0.5,
          }),
          Plot.tip(
            pts,
            Plot.pointer({
              x: 'desvio',
              y: 'codigo',
              title: (p: PontoPreco) => {
                const m = medio.get(p.codigo)!
                const un = m.un ? `/${m.un}` : ''
                return [
                  p.cliente,
                  rotulos.get(p.codigo),
                  `Preço: ${fmtMoeda(p.preco)}${un} (média ${fmtMoeda(m.preco)})`,
                  `Vs. média: ${fmtPct(p.desvio, 1, true)}`,
                  `Quantidade: ${fmtQtd(p.qtd)} · ${fmtMoeda(p.valor)}`,
                ].join('\n')
              },
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [produtos, pontos]
  )
  return (
    <div className="flex h-full flex-col gap-1">
      <Legenda
        itens={[
          { nome: 'Cliente abaixo da média', cor: COR.vermelho },
          { nome: 'Cliente na média ou acima', cor: COR.verde },
          { nome: 'Faixa mínimo–máximo', cor: COR.cinza },
        ]}
      />
      <div className="min-h-0 flex-1">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

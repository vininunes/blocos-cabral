import { useCallback } from 'react'

import * as Plot from '@observablehq/plot'
import type { EstadoBanco } from '@server/relatorio/api-tipos'
import { fmtData, fmtNum } from '@server/relatorio/utils'
import { CalendarRange } from 'lucide-react'

import { PlotBox } from '@/atomic/features/relatorio-graficos/components/plot-box'

import { COR, ESTILO, TOOLTIP } from '@/atomic/features/relatorio-graficos/constants/grafico'

const CORES: Record<string, string> = {
  propostas: COR.azul,
  pedidos: COR.grafite,
  notas: COR.verde,
}
const DIA_MS = 86_400_000
const utc = (d: string) => new Date(`${d}T00:00:00Z`)

type Celula = { fonte: string; tabela: string; dia: string; n: number }

/**
 * Barra de cobertura: uma linha por fonte com os dias que têm registros (mais forte = mais
 * registros no dia) e, em destaque, o período comum a todas — o "até agora" do relatório.
 */
export function BancoCobertura({ estado }: { estado: EstadoBanco }) {
  const [ini, fim] = estado.cobertura
  const build = useCallback(
    (width: number, height: number) => {
      const celulas: Celula[] = estado.fontes.flatMap((f) =>
        f.dias.map(([dia, n]) => ({ fonte: f.nome, tabela: f.tabela, dia, n }))
      )
      if (!celulas.length) return null
      const todos = celulas.map((c) => c.dia).sort()
      const x0 = utc(todos[0]),
        x1 = new Date(utc(todos.at(-1)!).getTime() + DIA_MS)
      const maior = Math.max(...celulas.map((c) => c.n))
      const nomes = estado.fontes.map((f) => f.nome)
      return Plot.plot({
        width,
        height,
        marginTop: 26,
        marginRight: 12,
        marginBottom: 24,
        marginLeft: 92,
        style: ESTILO,
        x: {
          type: 'utc',
          domain: [x0, x1],
          label: null,
          tickFormat: (d: Date) => fmtData(d.toISOString().slice(0, 10), false),
        },
        y: { domain: nomes, label: null, tickSize: 0, padding: 0.25 },
        marks: [
          ...(ini && fim
            ? [
                Plot.rectX([0], {
                  x1: utc(ini),
                  x2: new Date(utc(fim).getTime() + DIA_MS),
                  fill: 'var(--primary)',
                  fillOpacity: 0.08,
                }),
                Plot.ruleX([utc(ini), new Date(utc(fim).getTime() + DIA_MS)], {
                  stroke: 'var(--primary)',
                  strokeDasharray: '4 3',
                }),
                Plot.text([0], {
                  x: utc(ini),
                  frameAnchor: 'top',
                  dy: -16,
                  textAnchor: 'start',
                  dx: 2,
                  fill: 'var(--primary)',
                  fontWeight: 600,
                  text: () => `Período comum (relatório): ${fmtData(ini)} a ${fmtData(fim)}`,
                }),
              ]
            : []),
          Plot.rect(celulas, {
            x1: (c: Celula) => utc(c.dia),
            x2: (c: Celula) => new Date(utc(c.dia).getTime() + DIA_MS - DIA_MS * 0.12),
            y: 'fonte',
            fill: (c: Celula) => CORES[c.tabela],
            fillOpacity: (c: Celula) => 0.35 + 0.65 * (c.n / maior),
            rx: 2,
          }),
          Plot.tip(
            celulas,
            Plot.pointer({
              x: (c: Celula) => new Date(utc(c.dia).getTime() + DIA_MS / 2),
              y: 'fonte',
              title: (c: Celula) =>
                `${c.fonte} · ${fmtData(c.dia)}\n${fmtNum(c.n)} registro${c.n === 1 ? '' : 's'}`,
              ...TOOLTIP,
            })
          ),
        ],
      })
    },
    [estado, ini, fim]
  )
  return (
    <div className="shrink-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="size-4" /> Período com dados
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {estado.fontes.map((f) => (
            <span key={f.tabela}>
              <span className="font-medium text-foreground">{f.nome}</span>:{' '}
              {f.inicio
                ? `${fmtData(f.inicio)} a ${fmtData(f.fim)} · ${fmtNum(f.dias.length)} dias com registros`
                : 'sem dados'}
            </span>
          ))}
        </div>
      </div>
      <div className="h-36 rounded-lg border border-input bg-muted/40 p-2">
        <PlotBox build={build} />
      </div>
    </div>
  )
}

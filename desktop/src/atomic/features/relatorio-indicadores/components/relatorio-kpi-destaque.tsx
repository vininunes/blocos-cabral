import type { KpiJson, RespostaRelatorio } from '@server/relatorio/api-tipos'

import { fmtCurto, fmtDelta, fmtKpi } from '../helpers/formato-kpi'
import { RelatorioKpiDelta } from './relatorio-kpi-delta'

/** Cartão grande: valor de A, variação e barras A x B. */
export function RelatorioKpiDestaque({ k, rel }: { k: KpiJson; rel: RespostaRelatorio }) {
  const delta = fmtDelta(k, rel)
  const maior = Math.max(Math.abs(k.atual ?? 0), Math.abs(k.anterior ?? 0)) || 1
  const linhas: [string, number | null, string][] = [[rel.nomeA, k.atual, 'bg-cabral-azul']]
  if (rel.compara && rel.coberturaB !== 'nenhuma')
    linhas.push([rel.nomeB, k.anterior, 'bg-[#c8cbd2] dark:bg-[#5b6170]'])
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {k.nome}
      </div>
      <div className="text-2xl font-bold tabular-nums text-primary dark:text-foreground">
        {fmtKpi(k.atual, k.formato)}
      </div>
      {delta && <RelatorioKpiDelta delta={delta} />}
      {rel.compara && (
        <div className="mt-1 space-y-1">
          {linhas.map(([rot, v, cor]) => {
            const w = v === null ? 0 : Math.max((Math.abs(v) / maior) * 100, v ? 1 : 0)
            return (
              <div key={rot} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 shrink-0 truncate text-muted-foreground" title={rot}>
                  {rot}
                </span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${cor}`} style={{ width: `${w}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right tabular-nums">
                  {fmtCurto(v, k.formato)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

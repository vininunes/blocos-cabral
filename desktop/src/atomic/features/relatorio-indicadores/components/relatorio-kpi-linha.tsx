import type { KpiJson, RespostaRelatorio } from '@server/relatorio/api-tipos'

import { fmtDelta, fmtKpi } from '../helpers/formato-kpi'
import { RelatorioKpiDelta } from './relatorio-kpi-delta'

/** Cartão compacto: nome e valor na mesma linha, variação e valor de B embaixo. */
export function RelatorioKpiLinha({ k, rel }: { k: KpiJson; rel: RespostaRelatorio }) {
  const delta = fmtDelta(k, rel)
  return (
    <div className="rounded-md border border-border border-l-4 border-l-[#c8cbd2] bg-card px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{k.nome}</span>
        <span className="text-base font-bold tabular-nums">{fmtKpi(k.atual, k.formato)}</span>
      </div>
      {delta && <RelatorioKpiDelta delta={delta} />}
      {rel.compara && rel.coberturaB !== 'nenhuma' && (
        <div className="text-[11px] text-muted-foreground">
          {rel.nomeB}: {fmtKpi(k.anterior, k.formato)}
        </div>
      )}
    </div>
  )
}

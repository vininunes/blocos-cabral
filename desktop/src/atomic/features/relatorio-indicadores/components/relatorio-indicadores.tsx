import type { RespostaRelatorio } from '@server/relatorio/api-tipos'

import { RelatorioKpiDestaque } from './relatorio-kpi-destaque'
import { RelatorioKpiLinha } from './relatorio-kpi-linha'

/**
 * Destaques em cartões grandes; depois um bloco por etapa do fluxo (relatório completo)
 * ou os indicadores lado a lado (relatório focado num status).
 */
export function RelatorioIndicadores({ rel }: { rel: RespostaRelatorio }) {
  const [destaques, ...blocos] = rel.grupos
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {destaques.kpis.map((k) => (
          <RelatorioKpiDestaque key={k.nome} k={k} rel={rel} />
        ))}
      </div>
      {blocos.length === 1 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {blocos[0].kpis.map((k) => (
            <RelatorioKpiLinha key={k.nome} k={k} rel={rel} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {blocos.map((b) => (
            <div key={b.titulo} className="space-y-2">
              <div className="border-b-2 border-primary pb-1 text-xs font-bold uppercase tracking-wider text-primary dark:border-foreground dark:text-foreground">
                {b.titulo}
              </div>
              {b.kpis.map((k) => (
                <RelatorioKpiLinha key={k.nome} k={k} rel={rel} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtData } from '@server/relatorio/utils'
import { CalendarRange } from 'lucide-react'

import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * No lugar dos controles de período, nas abas que mostram a base inteira (Pedidos, rankings,
 * Provisão e Detalhamento).
 */
export function RelatorioPeriodoTodo({ rel }: { rel: RespostaRelatorio }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FloatCard className="flex h-9 items-center gap-2 px-3 text-xs">
        <CalendarRange className="size-3.5 text-muted-foreground" />
        <span className="font-medium">Período todo</span>
        <span className="text-muted-foreground tabular-nums">
          {fmtData(rel.todo.inicio)} a {fmtData(rel.todo.fim)}
        </span>
      </FloatCard>
      <span className="text-xs text-muted-foreground">
        Esta aba mostra a base inteira. O período escolhido vale para Indicadores, Visão geral e
        Feedback.
      </span>
    </div>
  )
}

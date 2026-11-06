import { cn } from '@/lib/tailwind/utils'

import type { Delta } from '../helpers/formato-kpi'

const TOM = { pos: 'text-cabral-verde', neg: 'text-cabral-vermelho', neu: 'text-muted-foreground' }

export function RelatorioKpiDelta({ delta, className }: { delta: Delta; className?: string }) {
  return (
    <div className={cn('text-xs font-semibold', TOM[delta.tom], className)}>
      {delta.seta && `${delta.seta} `}
      {delta.principal}
      {delta.detalhe && <span className="font-normal opacity-80"> · {delta.detalhe}</span>}
    </div>
  )
}

import { cn } from '@/lib/tailwind/utils'

import { iconeDoStatus } from '../helpers/icone-status'

/** Texto de um status com o ícone dele na frente (sem ícone quando não é um status). */
export function TextoStatus({ texto, className }: { texto: string; className?: string }) {
  const Icone = iconeDoStatus(texto)
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      {Icone && <Icone className="size-3.5 shrink-0 text-muted-foreground" />}
      <span className="truncate">{texto}</span>
    </span>
  )
}

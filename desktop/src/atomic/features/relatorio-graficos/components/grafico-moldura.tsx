import type { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

/** Moldura dos gráficos (padrão do design system) com título e ações opcionais. */
export function GraficoMoldura({
  titulo,
  acoes,
  rodape,
  altura,
  className,
  children,
}: {
  titulo?: ReactNode
  acoes?: ReactNode
  rodape?: ReactNode
  /** Altura da área do gráfico em px; sem altura, ocupa o espaço disponível (pai flex coluna). */
  altura?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 min-w-0',
        altura === undefined && 'min-h-0 flex-1',
        className
      )}
    >
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-2 min-h-7">
          {titulo && <h3 className="text-sm font-semibold">{titulo}</h3>}
          {acoes}
        </div>
      )}
      <div
        className={cn(
          'rounded-lg border border-input bg-muted/40 p-2',
          altura === undefined && 'min-h-0 flex-1'
        )}
        style={altura === undefined ? undefined : { height: altura }}
      >
        {children}
      </div>
      {rodape && <p className="text-xs text-muted-foreground">{rodape}</p>}
    </div>
  )
}

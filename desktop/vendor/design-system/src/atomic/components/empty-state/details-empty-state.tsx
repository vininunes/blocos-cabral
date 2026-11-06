import { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

/**
 * Empty-state padrão das seções do módulo details: ícone da seção + título +
 * descrição (explicando POR QUE não há nada a exibir). Usar em toda seção
 * (vessels, fleets, ports, underspeed, operational status, alerts, co2,
 * planned routes, ...) para a experiência ficar consistente.
 */
export function DetailsEmptyState({
  icon,
  title,
  description,
  className,
}: {
  /** Ícone da seção (o mesmo do sidebar — lucide ou IconProvider). */
  icon: ReactNode
  title: string
  description: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-2 px-6 text-center',
        className
      )}
    >
      <span className="mb-2 text-muted-foreground [&_svg]:size-6">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  )
}

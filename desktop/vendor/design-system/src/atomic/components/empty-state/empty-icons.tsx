import { IconProvider } from '@/atomic/base-components/icon-provider'

import { cn } from '@/lib/tailwind/utils'

/**
 * Ícones de seção no formato que o EmptyListPlaceholder espera (componente que
 * recebe className). O size-5 sobrescreve o size-6 padrão do placeholder — os
 * ícones do IconProvider são visualmente mais "cheios" que os da lucide.
 */

export function VesselEmptyIcon({ className }: { className?: string }) {
  return <IconProvider icon="vessels" className={cn(className, 'size-5')} />
}

export function FleetEmptyIcon({ className }: { className?: string }) {
  return <IconProvider icon="fleets" className={cn(className, 'size-5')} />
}

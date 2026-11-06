import { Scan } from 'lucide-react'

import { IconMapVessel } from '@/assets/svg'

import { cn } from '@/lib/tailwind/utils'

/** Ícone composto de rastreio de navio: moldura de scan com o vessel (35°)
 * no centro. Usado no autotracking do CCTV (vessel card e badge do feed). */
export function VesselScanIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn('relative inline-flex size-4 shrink-0 items-center justify-center', className)}
    >
      <Scan className="absolute inset-0 h-full w-full" />
      {/* Tamanho inline: dentro de Button, o seletor [&_svg:not([class*='size-'])]
          forçaria size-4 no svg — style vence e mantém o vessel pequeno. */}
      <IconMapVessel className="rotate-[40deg]" style={{ width: 4, height: 8 }} />
    </span>
  )
}

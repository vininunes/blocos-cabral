import { HTMLMotionProps, motion } from 'framer-motion'
import { useAtomValue } from 'jotai'

import { decreaseGpuUsageState } from '@/atomic/features/settings/store/settings-state'

import { cn } from '@/lib/tailwind/utils'

export function FloatCard({ className, ...props }: HTMLMotionProps<'div'>) {
  // decrease_gpu_usage: modo sem backdrop-blur (máquinas sem GPU dedicada)
  const decreaseGpuUsage = useAtomValue(decreaseGpuUsageState)

  return (
    <motion.div
      data-float-card
      className={cn(
        // `relative`: o backdrop-filter (modo com blur) torna o card um
        // containing block para descendentes `absolute`; sem ele (modo flat)
        // o `relative` cumpre esse papel — sem isso, labels/indicadores
        // posicionados em absolute vazariam para fora do card.
        'relative outline outline-offset outline-foreground/20 shadow rounded-xl pointer-events-auto',
        decreaseGpuUsage
          ? // Versão flat (sem blur): cor sólida do token --background-flat
            'bg-background-flat'
          : 'bg-background backdrop-blur-md',
        className
      )}
      {...props}
    />
  )
}

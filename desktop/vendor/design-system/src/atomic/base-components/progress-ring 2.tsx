import { cn } from '@/lib/tailwind/utils'

interface ProgressRingProps {
  /** 0-100 */
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
}

/** Anel de progresso em SVG puro — usado em badges de status com progresso ao vivo (ex.: validação de derrota, exportação de vídeo). */
export function ProgressRing({ percent, size = 22, strokeWidth = 2, className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-current opacity-25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-current transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute text-[9px] font-semibold tabular-nums">{percent}</span>
    </span>
  )
}

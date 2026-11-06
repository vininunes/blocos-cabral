import type { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

interface LabelValueProps {
  label: string
  children: ReactNode
  className?: string
}

export function LabelValue({ label, children, className }: LabelValueProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

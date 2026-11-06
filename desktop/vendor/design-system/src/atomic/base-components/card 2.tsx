import { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

type CardProps = {
  children?: ReactNode
  footer?: ReactNode
  header?: ReactNode
  className?: string
}

export function Card({ children, footer, header, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border shadow-xs flex flex-col justify-end text-foreground overflow-hidden',
        (header !== undefined || footer !== undefined) && 'border-t rounded-t-lg bg-secondary',
        className
      )}
    >
      {header && <div>{header}</div>}

      {children && (
        <div
          className={cn(
            'bg-muted/50 h-full w-full overflow-hidden flex-1 min-h-0',
            header !== undefined && 'border-t rounded-t-lg ',
            footer !== undefined && 'border-b rounded-b-lg '
          )}
        >
          {children}
        </div>
      )}

      {footer && <div>{footer}</div>}
    </div>
  )
}

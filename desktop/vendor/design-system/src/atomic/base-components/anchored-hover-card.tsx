import { useMemo, type ReactNode, type RefObject } from 'react'

import { cn } from '@/lib/tailwind/utils'

import { Popover, PopoverAnchor, PopoverContent } from './popover'

interface Measurable {
  getBoundingClientRect: () => DOMRect
  isConnected?: boolean
}

interface AnchoredHoverCardProps {
  anchor: Measurable | null
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  className?: string
}

export function AnchoredHoverCard({
  anchor,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  className,
}: AnchoredHoverCardProps) {
  const virtualRef = useMemo(() => ({ current: anchor }), [anchor])

  if (!anchor || anchor.isConnected === false) return null

  return (
    <Popover open>
      <PopoverAnchor virtualRef={virtualRef as RefObject<Measurable>} />
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        role="tooltip"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'pointer-events-none w-auto max-w-64 p-2 text-[11px] leading-tight',
          className
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

export interface AnchoredHoverCardRow {
  label: string
  value: ReactNode
}

interface AnchoredHoverCardBodyProps {
  title: string
  color?: string
  subtitle?: string
  rows?: AnchoredHoverCardRow[]
}

export function AnchoredHoverCardBody({
  title,
  color,
  subtitle,
  rows,
}: AnchoredHoverCardBodyProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {color && (
          <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
        )}
        <span className="truncate font-semibold">{title}</span>
        {subtitle && <span className="shrink-0 text-muted-foreground">{subtitle}</span>}
      </div>
      {rows && rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

import { type ComponentType } from 'react'

import { MousePointer2Off } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

interface EmptyListPlaceholderProps {
  text: string
  /** Ícone (lucide ou SVG custom — qualquer componente que aceite className). */
  icon?: ComponentType<{ className?: string }>
  /** Extra classes for the wrapper (e.g. `absolute w-full h-full` inside `<List placeHolder>`). */
  className?: string
}

/** Centered empty-state for list windows: an icon over a muted text line. */
export function EmptyListPlaceholder({
  text,
  icon: Icon = MousePointer2Off,
  className,
}: EmptyListPlaceholderProps) {
  return (
    <div
      className={cn(
        'h-full flex items-center justify-center flex-col gap-3 overflow-hidden',
        className
      )}
    >
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

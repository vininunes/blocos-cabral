import { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

import { BadgeBase, BadgeVariant } from './badge-base'

export type BadgeItem = {
  text: string
  icon?: ReactNode
  color: BadgeVariant
  className?: string
}

export type BadgeProps = {
  items: Array<BadgeItem>
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ items, className, size = 'md' }: BadgeProps) {
  return (
    <div className={cn('flex flex-wrap items-start gap-2', className)}>
      {items.map((badge, index) => (
        <BadgeBase
          key={index}
          className={cn(`badge-${size}`, badge.className)}
          variant={badge.color}
          asChild={false}
        >
          {badge.icon}
          {badge.text}
        </BadgeBase>
      ))}
    </div>
  )
}

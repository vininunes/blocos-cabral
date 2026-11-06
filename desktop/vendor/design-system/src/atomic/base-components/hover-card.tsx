import * as React from 'react'

import { HoverCardContentProps } from '@radix-ui/react-hover-card'

import { HoverCardBase, HoverCardBaseContent, HoverCardBaseTrigger } from './hover-card-base'

export type HoverCardProps = React.ComponentProps<typeof HoverCardBase> & {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
  align?: HoverCardContentProps['align']
  side?: HoverCardContentProps['side']
  sideOffset?: HoverCardContentProps['sideOffset']
  alignOffset?: HoverCardContentProps['alignOffset']
}

export function HoverCard({
  trigger,
  children,
  align,
  side,
  sideOffset = 8,
  alignOffset,
  ...props
}: HoverCardProps) {
  return (
    <HoverCardBase {...props}>
      <HoverCardBaseTrigger>{trigger}</HoverCardBaseTrigger>
      <HoverCardBaseContent
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        align={align}
        side={side}
      >
        {children}
      </HoverCardBaseContent>
    </HoverCardBase>
  )
}

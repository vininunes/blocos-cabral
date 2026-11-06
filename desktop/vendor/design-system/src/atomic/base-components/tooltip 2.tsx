import { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react'

import { TooltipContentProps, TooltipTrigger } from '@radix-ui/react-tooltip'

import { TooltipBase, TooltipContent } from './tooltip-base'

export default function Tooltip({
  children,
  text,
  sideOffset = 6,
  className,
  disabled = false,
  ...rest
}: {
  children: ReactNode
  text: string
  disabled?: boolean
} & React.ComponentProps<
  ForwardRefExoticComponent<TooltipContentProps & RefAttributes<HTMLDivElement>>
>) {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipBase>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={className} sideOffset={sideOffset} {...rest}>
        <p className="text-[10px]">{text}</p>
      </TooltipContent>
    </TooltipBase>
  )
}

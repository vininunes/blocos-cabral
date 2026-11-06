import { cloneElement, Fragment, HTMLAttributes, isValidElement, ReactNode, useMemo } from 'react'

import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

import { Button } from './button'
import { Separator } from './separator'

interface BoxElement {
  element: ReactNode
  key: string
}

// Sobrescreve o card padrão do Box (border/rounded/bg/shadow) quando ele é
// usado dentro de outro container que já tem seu próprio contorno visual
// (ex: um sheet lateral) — evita "caixa dentro de caixa".
export const BOX_BARE_CLASSNAME = 'border-none rounded-none bg-transparent shadow-none'

export function Box({
  className,
  elements,
  title,
  icon,
  separatorFull = false,
  disabled = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  elements: BoxElement[]
  title?: string
  icon?: ReactNode
  separatorFull?: boolean
  disabled?: boolean
}) {
  const render = useMemo(() => {
    return elements.map(({ element, key }, index) => {
      const elementWithKey = isValidElement(element) ? (
        cloneElement(element, { key })
      ) : (
        <Fragment key={key}>{element}</Fragment>
      )

      if (index === 0)
        return (
          <Fragment key={`wrapper-${key}`}>
            <div className="w-full min-h-7 h-fit flex">{elementWithKey}</div>
          </Fragment>
        )

      return (
        <Fragment key={`wrapper-${key}`}>
          <div className={cn(' w-full', !separatorFull && 'px-2')}>
            <Separator />
          </div>
          <div className="w-full min-h-7 h-fit flex">{elementWithKey}</div>
        </Fragment>
      )
    })
  }, [elements, separatorFull])

  return (
    <div className={cn('flex flex-col', disabled && 'opacity-50 pointer-events-none')}>
      {title && (
        <div className="flex gap-1 pl-2 pb-1 items-center">
          {icon && <div className="scale-80 opacity-75">{icon}</div>}
          <p className="text-xs  text-muted-foreground">{title}</p>
        </div>
      )}
      <div
        {...props}
        className={cn(
          'flex flex-col items-center w-ful h-fit justify-between border rounded-md bg-muted/35 shadow ',
          className
        )}
      >
        {render}
      </div>
    </div>
  )
}

export function BoxElement({
  title,
  description,
  onClick,
  icon,
  renderRight,
  chevronRight = false,
  disabled = false,
  hover = false,
  className,
}: {
  title: string
  description?: string
  onClick?: () => void
  icon?: ReactNode
  renderRight?: ReactNode
  chevronRight?: boolean
  disabled?: boolean
  hover?: boolean
  className?: string
}) {
  return (
    <Button
      variant={'ghost'}
      className={cn(
        'flex items-center w-full flex-1 !p-2 h-11 justify-between !rounded-none hover:!bg-transparent cursor-auto',
        hover && 'hover:!bg-secondary/70',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex gap-2 items-center">
        {icon}
        <div className="flex items-start flex-col">
          <p className="text-sm">{title}</p>
          {description && (
            <p className="text-[10px] text-muted-foreground w-[80%]">{description}</p>
          )}
        </div>
      </div>
      {chevronRight ? <ChevronRight /> : renderRight}
    </Button>
  )
}

export function BoxElementHandler({
  handler,
  title,
  description,
  icon,
  className,
  descriptionClassName,
}: {
  handler: ReactNode
  title: ReactNode
  description?: string
  icon?: ReactNode
  className?: string
  descriptionClassName?: string
}) {
  return (
    <div className={cn('flex items-center w-full min-h-12 justify-between p-2', className)}>
      <div className="flex gap-2 items-center">
        {icon}
        <div className="flex flex-col">
          <p className="text-sm">{title}</p>
          {description && (
            <p className={cn('text-[10px] text-muted-foreground w-full', descriptionClassName)}>
              {description}
            </p>
          )}
        </div>
      </div>
      {handler}
    </div>
  )
}

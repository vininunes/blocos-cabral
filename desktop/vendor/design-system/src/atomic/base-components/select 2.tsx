import { ReactNode } from 'react'

import { SelectContentProps, SelectProps } from '@radix-ui/react-select'

import { cn } from '@/lib/tailwind/utils'

import {
  SelectBase,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select-base'

export type SelectItems = Array<SelectItem>
export type SelectItem = Array<{ value: string; name: string; icon?: ReactNode; disabled?: boolean }>

function Select({
  separator = false,
  items,
  sections,
  placeholder,
  className,
  contentProps,
  variant = 'default',
  ...props
}: {
  items: SelectItems
  sections?: string[]
  placeholder?: string
  label?: string
  separator?: boolean
  className?: React.ComponentProps<'div'>['className']
  contentProps?: SelectContentProps
  /** 'float': para uso dentro de FloatCards (page actions) — trigger com
   *  altura total, fundo branco translúcido e cantos do card. */
  variant?: 'default' | 'float'
} & SelectProps) {
  const render = items.map((item, index) => {
    const renderItems = []

    const section = sections !== undefined ? sections[index] : null

    if (separator && index !== 0) renderItems.push(<SelectSeparator key={`separator-${section}`} />)

    if (section !== null) renderItems.push(<SelectLabel key={section}>{section}</SelectLabel>)

    item.forEach((item) => {
      renderItems.push(
        <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
          {item.icon}
          {item.name}
        </SelectItem>
      )
    })

    return renderItems
  })

  return (
    <div className={cn('grid gap-2', className)}>
      <SelectBase {...props}>
        <SelectTrigger
          className={cn(
            'cursor-pointer',
            // Variante float: preenche o FloatCard (page actions), fundo
            // branco translúcido — mesmo visual do input search; px-2.5 dá o
            // mesmo respiro horizontal do date select
            variant === 'float' &&
              'data-[size=default]:h-full rounded-xl px-2.5 bg-white/5 border-transparent shadow-none dark:hover:bg-white/5',
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align={variant === 'float' ? 'center' : undefined} {...contentProps}>
          <SelectGroup>{...render}</SelectGroup>
        </SelectContent>
      </SelectBase>
    </div>
  )
}

export { Select }

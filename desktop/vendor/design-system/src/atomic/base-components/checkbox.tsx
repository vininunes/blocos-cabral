import type { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

import { CheckboxBase } from './checkbox-base'
import { Label } from './label'

export type CheckboxItem = {
  id?: string
  label: string
  description?: string
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  disabled?: boolean
  highlightOnCheck?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

type CheckboxGroupProps = {
  items: CheckboxItem[]
  className?: string
  direction?: 'column' | 'row'
}

type CheckboxSingleProps = {
  id?: string
  /** Aceita nó, não só texto: há rótulos que levam ícone junto (ex.: o canal
   * in-app, que mostra a marca do produto). */
  label?: ReactNode
  description?: string
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  disabled?: boolean
  highlightOnCheck?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

type CheckboxProps =
  | ({ items: CheckboxItem[] } & Omit<CheckboxGroupProps, 'items'>)
  | (CheckboxSingleProps & { items?: never })

export function Checkbox(props: CheckboxProps) {
  if ('items' in props && props.items) {
    const { items, className, direction = 'column' } = props
    return (
      <div
        className={cn(
          'flex',
          direction === 'column' ? 'flex-col' : 'flex-row',
          'flex-wrap',
          className
        )}
      >
        {items.map((item, index) => (
          <Label
            key={item.id ?? index}
            htmlFor={item.id}
            className={cn(
              'flex items-start gap-3 rounded-md p-3 text-sm cursor-pointer transition-colors',
              item.highlightOnCheck && [
                'border',
                'hover:bg-accent/50',
                'has-[[aria-checked=true]]:border-primary',
                'has-[[aria-checked=true]]:bg-primary/40',
                'has-[[aria-checked=true]]:text-primary-foreground',
              ],
              item.className
            )}
          >
            <CheckboxBase
              id={item.id}
              checked={item.checked}
              defaultChecked={item.defaultChecked}
              disabled={item.disabled}
              onCheckedChange={(val) => item.onChange?.(!!val)}
            />
            <div className="grid gap-1 font-normal leading-tight">
              <p className="font-medium">{item.label}</p>
              {item.description && <p className="text-sm opacity-80">{item.description}</p>}
            </div>
          </Label>
        ))}
      </div>
    )
  } else {
    const {
      id,
      label,
      description,
      checked,
      defaultChecked,
      disabled,
      highlightOnCheck,
      onCheckedChange,
      className,
    } = props

    return (
      <Label
        htmlFor={id}
        className={cn(
          'flex items-center gap-3 rounded-md p-1 text-sm cursor-pointer transition-colors select-none',
          highlightOnCheck && [
            'border',
            'hover:bg-accent/50',
            'has-[[aria-checked=true]]:border-primary',
            'has-[[aria-checked=true]]:bg-primary/40',
            'has-[[aria-checked=true]]:text-primary-foreground',
          ],
          className
        )}
      >
        <CheckboxBase
          id={id}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onCheckedChange={(val) => onCheckedChange?.(!!val)}
        />
        {(label || description) && (
          <div className="grid gap-1 font-normal leading-tight">
            {label && <p className="font-medium">{label}</p>}
            {description && <p className="text-sm opacity-80">{description}</p>}
          </div>
        )}
      </Label>
    )
  }
}

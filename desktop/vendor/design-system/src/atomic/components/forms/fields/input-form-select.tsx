import type { ReactNode } from 'react'

import { useController, useFormContext } from 'react-hook-form'

import {
  SelectBase,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/atomic/base-components/select-base'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface SelectFormOption {
  value: string | number
  label: string
  /** Ícone opcional antes do rótulo (aparece na lista e no valor selecionado). */
  icon?: ReactNode
}

export interface SelectFormProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  options: SelectFormOption[]
  disabled?: boolean
  className?: string
  onValueChange?: (value: string) => void
}

export function InputFormSelect({
  name,
  label,
  placeholder,
  required = false,
  layout = 'horizontal',
  options,
  disabled = false,
  className,
  onValueChange,
}: SelectFormProps) {
  const { control } = useFormContext()
  const { field } = useController({
    name,
    control,
  })

  const handleValueChange = (value: string) => {
    field.onChange(value)
    onValueChange?.(value)
  }

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormFieldContainer layout={layout}>
          {label && (
            <FormLabel>
              {label}
              {required && <RequiredAsterisk />}
            </FormLabel>
          )}
          <FormControl>
            <SelectBase
              value={field.value?.toString() || ''}
              onValueChange={handleValueChange}
              disabled={disabled}
            >
              {/* Largura padrão dos controles em linha — sobrescrevível com um w-*. */}
              <SelectTrigger className={cn(layout === 'horizontal' && 'w-64', className)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.icon ? (
                        <span className="inline-flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </span>
                      ) : (
                        option.label
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </SelectBase>
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

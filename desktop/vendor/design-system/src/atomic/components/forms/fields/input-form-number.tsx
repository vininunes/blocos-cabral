import React from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { InputNumber } from '@/atomic/base-components/input-number'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormNumberProps
  extends Omit<React.ComponentProps<typeof InputNumber>, 'name' | 'value' | 'onValueChange'> {
  name: string
  label?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function InputFormNumber({
  name,
  label,
  required = false,
  layout = 'horizontal',
  className,
  ...props
}: InputFormNumberProps) {
  const { control } = useFormContext()
  const { field } = useController({
    name,
    control,
  })

  /**
   * Handles value change ensuring only valid numbers are set
   * Converts string to number or sets null for invalid values
   */
  const handleValueChange = (value: number | string | undefined) => {
    if (value === '' || value == null) {
      field.onChange(null)
      return
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value

    if (!isNaN(numValue) && isFinite(numValue)) {
      field.onChange(numValue)
    } else {
      field.onChange(null)
    }
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
            {/* Largura padrão dos controles em linha — sobrescrevível com um w-*. */}
            <InputNumber
              {...props}
              className={cn(layout === 'horizontal' && 'w-64', className)}
              value={field.value ?? ''}
              onValueChange={handleValueChange}
              onChange={(e) => handleValueChange(e.target.value)}
              type={'number'}
            />
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

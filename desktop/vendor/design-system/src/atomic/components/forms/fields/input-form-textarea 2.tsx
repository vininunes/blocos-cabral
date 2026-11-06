import React from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { Textarea } from '@/atomic/base-components/text-area'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormTextareaProps
  extends Omit<React.ComponentProps<typeof Textarea>, 'name'> {
  name: string
  label?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function InputFormTextarea({
  name,
  label,
  required = false,
  layout = 'vertical',
  className,
  ...props
}: InputFormTextareaProps) {
  const { control } = useFormContext()
  const { field } = useController({
    name,
    control,
  })

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
            <Textarea
              {...field}
              {...props}
              className={cn(layout === 'horizontal' && 'w-64', className)}
            />
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

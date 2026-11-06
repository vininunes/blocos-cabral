import React from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { ColorPicker, ColorSwatchPicker } from '@/atomic/base-components/color-picker'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormColorProps
  extends Omit<React.ComponentProps<typeof ColorSwatchPicker>, 'value' | 'onChange'> {
  name: string
  label?: string
  colors: string[]
  required?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function InputFormColor({
  name,
  label,
  colors,
  required = false,
  layout = 'horizontal',
  ...props
}: InputFormColorProps) {
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
            <ColorPicker
              {...props}
              colorSwatchValue={colors}
              value={field.value}
              onChange={(color) => field.onChange(color)}
            />
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

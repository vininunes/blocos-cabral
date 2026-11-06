import React from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { InfoTooltip } from '@/atomic/base-components/info-tooltip'
import { Switch } from '@/atomic/base-components/switch'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormSwitchProps extends Omit<React.ComponentProps<typeof Switch>, 'name'> {
  name: string
  label?: string
  /** Explicação do campo, exibida em um ícone de ajuda ao lado do label. */
  tooltip?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function InputFormSwitch({
  name,
  label,
  tooltip,
  required = false,
  layout = 'horizontal',
  ...props
}: InputFormSwitchProps) {
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
            <FormLabel className="flex items-center gap-1.5">
              {label}
              {required && <RequiredAsterisk />}
              {tooltip && <InfoTooltip text={tooltip} />}
            </FormLabel>
          )}
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} {...props} />
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

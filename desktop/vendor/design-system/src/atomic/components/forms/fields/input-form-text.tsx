import React from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { InfoTooltip } from '@/atomic/base-components/info-tooltip'
import { InputText } from '@/atomic/base-components/input-text'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormTextProps extends Omit<React.ComponentProps<typeof InputText>, 'name'> {
  name: string
  label?: string
  /** Explicação do campo, exibida em um ícone de ajuda ao lado do label. */
  tooltip?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  /** Classes para o wrapper do campo (FormFieldContainer) — ex.: `p-0` para
   * remover o padding padrão em volta de label + input. */
  containerClassName?: string
}

export function InputFormText({
  name,
  label,
  tooltip,
  required = false,
  layout = 'horizontal',
  className,
  containerClassName,
  ...props
}: InputFormTextProps) {
  const { control } = useFormContext()
  const { field } = useController({
    name,
    control,
  })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormFieldContainer layout={layout} className={containerClassName}>
          {label && (
            <FormLabel className="flex items-center gap-1.5">
              {label}
              {required && <RequiredAsterisk />}
              {tooltip && <InfoTooltip text={tooltip} />}
            </FormLabel>
          )}
          <FormControl>
            {/* Largura padrão dos controles em linha (label à esquerda, controle à
                direita) — sobrescrevível com um w-* via className. */}
            <InputText
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

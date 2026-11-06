import { useController, useFormContext } from 'react-hook-form'

import { DatePicker } from '@/atomic/base-components/date-picker'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormDatePickerProps {
  name: string
  label?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  showTime?: boolean
  timeOutside?: boolean
  disabled?: boolean
  className?: string
}

export function InputFormDatePicker({
  name,
  label,
  required = false,
  layout = 'horizontal',
  showTime = true,
  timeOutside = false,
  disabled,
  className,
}: InputFormDatePickerProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  const dateValue: Date | undefined = field.value
    ? typeof field.value === 'string'
      ? new Date(field.value)
      : field.value
    : undefined

  const handleChange = (date: Date | undefined) => {
    field.onChange(date ? date.toISOString() : '')
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
            <DatePicker
              value={dateValue}
              onChange={handleChange}
              showTime={showTime}
              timeOutside={timeOutside}
              disabled={disabled}
              className={cn(layout === 'horizontal' && 'w-64', className)}
              format="DD/MM/YYYY"
            />
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

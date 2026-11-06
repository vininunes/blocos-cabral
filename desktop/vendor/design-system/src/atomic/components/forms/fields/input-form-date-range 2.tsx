import { t } from 'i18next'
import { CalendarIcon } from 'lucide-react'
import { useController, useFormContext } from 'react-hook-form'

import { Button } from '@/atomic/base-components/button'
import { DateRangeSelect } from '@/atomic/base-components/date-range-select'
import { DateRangeOption } from '@/atomic/base-components/date-range-select-options'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormDateRangeProps {
  startName: string
  endName: string
  label?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  showTime?: boolean
  utc?: boolean
  disabled?: boolean
  options?: DateRangeOption[]
  iconOnly?: boolean
  hidePresets?: boolean
  className?: string
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

export function InputFormDateRange({
  startName,
  endName,
  label,
  required = false,
  layout = 'horizontal',
  showTime = true,
  utc = false,
  disabled,
  options,
  iconOnly,
  hidePresets,
  className,
}: InputFormDateRangeProps) {
  const { control } = useFormContext()
  const { field: startField } = useController({ name: startName, control })
  const { field: endField } = useController({ name: endName, control })

  const startDate = toDate(startField.value)
  const endDate = toDate(endField.value)
  const hasValue = startDate !== undefined && endDate !== undefined

  const handleChange = (start: Date, end: Date) => {
    startField.onChange(start.toISOString())
    endField.onChange(end.toISOString())
  }

  const handleInitialize = () => {
    const now = new Date()
    handleChange(now, now)
  }

  return (
    <FormFieldContext.Provider value={{ name: startName }}>
      <FormItem>
        <FormFieldContainer layout={layout}>
          {label && (
            <FormLabel>
              {label}
              {required && <RequiredAsterisk />}
            </FormLabel>
          )}
          <FormControl>
            {hasValue ? (
              <DateRangeSelect
                startDate={startDate}
                endDate={endDate}
                onChange={handleChange}
                showTime={showTime}
                utc={utc}
                disabled={disabled}
                options={options}
                iconOnly={iconOnly}
                hidePresets={hidePresets}
                className={className}
              />
            ) : (
              <div className={cn('flex items-center gap-2', className)}>
                <div
                  className={cn(
                    'flex-1 min-w-0 h-7 px-3 rounded-md border border-input bg-input/40 shadow-xs',
                    'text-xs flex items-center text-muted-foreground'
                  )}
                >
                  <span className="truncate">{t('select-date-range')}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled}
                  className="size-7 flex-shrink-0"
                  onClick={handleInitialize}
                >
                  <CalendarIcon />
                </Button>
              </div>
            )}
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

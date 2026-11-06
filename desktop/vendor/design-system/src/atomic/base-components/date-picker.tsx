import { useState } from 'react'

import { t } from 'i18next'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'
import { dayjs } from '@/lib/time'

import { Button } from './button'
import { LazyCalendar as Calendar } from './calendar-lazy'
import { InputNumber } from './input-number'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

function DatePicker({
  value,
  onChange,
  disabled,
  showTime = false,
  timeOutside = false,
  fixedWeeks = false,
  utc = false,
  className,
  buttonClassName,
  format = 'LL',
}: {
  disabled?: React.ComponentProps<'button'>['disabled']
  value: Date | undefined
  onChange: (value: Date | undefined) => void
  showTime?: boolean
  timeOutside?: boolean
  fixedWeeks?: boolean
  utc?: boolean
  className?: string
  /** Classes extras do botão trigger (ex.: flex-1 para preencher o wrapper —
   *  sem isso a largura segue o texto da data). */
  buttonClassName?: string
  format?: string
}) {
  const [open, setOpen] = useState(false)

  // Resolve display values in the correct timezone
  const d = value ? (utc ? dayjs.utc(value) : dayjs(value)) : null
  const displayHours = d ? d.hour() : 0
  const displayMinutes = d ? d.minute() : 0
  // For defaultMonth: pass a Date whose local month matches the UTC month when utc=true
  const defaultMonth = value
    ? utc
      ? dayjs.utc(value).toDate()
      : value
    : undefined

  const handleTimeChange = (part: 'hour' | 'minute', val: number | undefined) => {
    if (val === undefined) return
    const base = value ? dayjs(utc ? dayjs.utc(value).format('YYYY-MM-DDTHH:mm:ss') + 'Z' : value) : dayjs()
    const updated = utc
      ? (part === 'hour' ? dayjs.utc(value).hour(val) : dayjs.utc(value).minute(val)).toDate()
      : (() => {
          const nd = base.toDate()
          if (part === 'hour') nd.setHours(val)
          else nd.setMinutes(val)
          return nd
        })()
    onChange(updated)
  }

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) {
      onChange(date)
      return
    }
    if (showTime && value) {
      if (utc) {
        // Preserve the current UTC hours/minutes on the new date
        const h = dayjs.utc(value).hour()
        const m = dayjs.utc(value).minute()
        const s = dayjs.utc(value).second()
        // Build the new date as a UTC datetime string then parse
        const utcStr = dayjs.utc(date).hour(h).minute(m).second(s).toDate()
        onChange(utcStr)
      } else {
        date.setHours(value.getHours(), value.getMinutes(), value.getSeconds())
        onChange(date)
      }
    } else {
      onChange(date)
    }
    if (timeOutside) setOpen(false)
  }

  const timeInputs = showTime && (
    <div className="flex items-center gap-1 flex-shrink-0">
      <InputNumber
        value={displayHours}
        min={0}
        max={23}
        className="w-14 text-center"
        onValueChange={(v) => handleTimeChange('hour', v)}
      />
      <span className="text-xs font-medium text-muted-foreground">:</span>
      <InputNumber
        value={displayMinutes}
        min={0}
        max={59}
        className="w-14 text-center"
        onValueChange={(v) => handleTimeChange('minute', v)}
      />
    </div>
  )

  const triggerLabel = value
    ? (utc ? dayjs.utc(value) : dayjs(value)).format(
        showTime && !timeOutside ? `${format} HH:mm` : format
      )
    : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled}
            variant={'outline'}
            className={cn(
              'justify-start text-left font-normal pl-0',
              !value && 'text-muted-foreground',
              buttonClassName
            )}
          >
            <div className="h-7 w-7 flex justify-center items-center bg-muted rounded-l-md">
              <CalendarIcon size={16} />
            </div>
            {triggerLabel ?? <span>{t('date-picker-hint')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={defaultMonth}
            fixedWeeks={fixedWeeks}
            onSelect={handleDaySelect}
            captionLayout="dropdown"
          />
          {!timeOutside && showTime && value && (
            <div className="flex items-center justify-center gap-1 px-3 pb-3">
              <InputNumber
                value={displayHours}
                min={0}
                max={23}
                className="w-14 text-center"
                onValueChange={(v) => handleTimeChange('hour', v)}
              />
              <span className="text-xs font-medium text-muted-foreground">:</span>
              <InputNumber
                value={displayMinutes}
                min={0}
                max={59}
                className="w-14 text-center"
                onValueChange={(v) => handleTimeChange('minute', v)}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
      {timeOutside && timeInputs}
    </div>
  )
}

export { DatePicker }

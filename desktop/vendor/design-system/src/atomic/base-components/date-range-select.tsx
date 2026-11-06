import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from 'i18next'
import { CalendarIcon, Check, Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/tailwind/utils'

import { Box, BoxElementHandler } from './box'
import { Button } from './button'
import { DatePicker } from './date-picker'
import {
  computePeriodFromOption,
  DateRangeOption,
  detectPeriod,
  getDefaultDateRangeOptions,
} from './date-range-select-options'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover'
import {
  SelectBase,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select-base'

/**
 * Variante "range" do seletor de data: presets de período relativo (último
 * dia, última semana…) + intervalo custom via popover — usada em maneuvers,
 * statistics, emission etc. A variante "navigator" (períodos fixos do
 * calendário com setas ‹ › no trigger) vive em `date-period-navigator.tsx`.
 */
interface DateRangeSelectProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
  options?: DateRangeOption[]
  iconOnly?: boolean
  noCalendar?: boolean
  hidePresets?: boolean
  disabled?: boolean
  showTime?: boolean
  utc?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  className?: string
  selectClassName?: string
  /** classes extras da bandeja (PopoverContent) — ex.: alargar com 'w-80' */
  popoverClassName?: string
  /** 'float': para uso dentro de FloatCards (page actions) — trigger com
   *  altura total, fundo branco translúcido e cantos do card. */
  variant?: 'default' | 'float'
  /** Troca o ícone de calendário do botão por um spinner (ex.: player
   *  carregando os chunks do range escolhido). Só afeta o botão de ícone. */
  loading?: boolean
}

export function DateRangeSelect({
  startDate,
  endDate,
  onChange,
  options,
  iconOnly = false,
  noCalendar = false,
  hidePresets = false,
  disabled = false,
  showTime = false,
  utc = false,
  align,
  side = 'bottom',
  sideOffset = 8,
  className,
  selectClassName,
  popoverClassName,
  variant = 'default',
  loading = false,
}: DateRangeSelectProps) {
  const effectiveAlign = align ?? (hidePresets ? 'center' : 'end')
  const { i18n } = useTranslation()
  const resolvedOptions = useMemo(() => options ?? getDefaultDateRangeOptions(), [options])

  const [activePeriod, setActivePeriod] = useState<string>(() =>
    detectPeriod(startDate, endDate, resolvedOptions)
  )
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [localStart, setLocalStart] = useState<Date>(startDate)
  const [localEnd, setLocalEnd] = useState<Date>(endDate)
  const originalRef = useRef({ start: startDate, end: endDate })

  useEffect(() => {
    setActivePeriod(detectPeriod(startDate, endDate, resolvedOptions))
  }, [startDate, endDate, resolvedOptions])

  const handlePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setLocalStart(startDate)
        setLocalEnd(endDate)
        originalRef.current = { start: startDate, end: endDate }
      }
      setPopoverOpen(open)
    },
    [startDate, endDate]
  )

  // Adia a abertura para depois do fechamento do Select: ao selecionar
  // "custom", o Radix fecha a bandeja e devolve o foco ao trigger — se o
  // popover já estiver aberto nesse instante, o retorno de foco conta como
  // "focus outside" e o fecha imediatamente (abre e fecha sozinho).
  const openCustomPopover = useCallback(() => {
    setTimeout(() => handlePopoverOpenChange(true), 0)
  }, [handlePopoverOpenChange])

  const handlePeriodChange = useCallback(
    (value: string) => {
      // Última opção do select: abre o popover de intervalo custom
      if (value === 'custom') {
        openCustomPopover()
        return
      }
      const opt = resolvedOptions.find((o) => o.value === value)
      if (!opt) return
      const { start, end } = computePeriodFromOption(opt)
      setActivePeriod(value)
      onChange(start, end)
    },
    [resolvedOptions, onChange, openCustomPopover]
  )

  const hasChanges =
    localStart.getTime() !== originalRef.current.start.getTime() ||
    localEnd.getTime() !== originalRef.current.end.getTime()

  const handleApply = useCallback(() => {
    setActivePeriod('custom')
    onChange(localStart, localEnd)
    setPopoverOpen(false)
  }, [localStart, localEnd, onChange])

  const onLocalStartChange = useCallback((date: Date | undefined) => {
    if (date) setLocalStart(date)
  }, [])

  const onLocalEndChange = useCallback((date: Date | undefined) => {
    if (date) setLocalEnd(date)
  }, [])

  const customLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (showTime) {
      opts.hour = '2-digit'
      opts.minute = '2-digit'
      opts.hour12 = false
    }
    const fmt = new Intl.DateTimeFormat(i18n.language, opts)
    return `${fmt.format(startDate)} – ${fmt.format(endDate)}`
  }, [startDate, endDate, i18n.language, showTime])

  const activeLabel =
    activePeriod === 'custom'
      ? customLabel
      : (resolvedOptions.find((o) => o.value === activePeriod)?.label ?? customLabel)

  const popoverBody = (
    <PopoverContent
      className={cn('w-64 p-2', popoverClassName)}
      align={effectiveAlign}
      side={side}
      sideOffset={sideOffset}
      // O foco que o Select devolve ao trigger ao fechar não deve fechar o
      // popover — clique fora e ESC continuam fechando normalmente
      onFocusOutside={(e) => e.preventDefault()}
    >
      <p className="text-xs text-muted-foreground text-center pb-1">{t('date-range-interval')}</p>
      <Box
        elements={[
          {
            key: 'range-start',
            element: (
              <BoxElementHandler
                title={t('start')}
                handler={
                  <DatePicker
                    showTime={showTime}
                    fixedWeeks
                    utc={utc}
                    className="flex-1 min-w-0 justify-end"
                    buttonClassName="w-full max-w-52"
                    value={localStart}
                    onChange={onLocalStartChange}
                  />
                }
              />
            ),
          },
          {
            key: 'range-end',
            element: (
              <BoxElementHandler
                title={t('end')}
                handler={
                  <DatePicker
                    showTime={showTime}
                    fixedWeeks
                    utc={utc}
                    className="flex-1 min-w-0 justify-end"
                    buttonClassName="w-full max-w-52"
                    value={localEnd}
                    onChange={onLocalEndChange}
                  />
                }
              />
            ),
          },
        ]}
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" className="w-24" onClick={() => setPopoverOpen(false)}>
          {t('cancel')}
        </Button>
        <Button size="sm" className="w-24" onClick={handleApply} disabled={!hasChanges}>
          <Check />
          {t('apply')}
        </Button>
      </div>
    </PopoverContent>
  )

  const calendarButton = (
    <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'size-7 flex-shrink-0',
            'data-[state=open]:bg-primary data-[state=open]:text-primary-foreground'
          )}
        >
          {loading ? <Loader className="animate-spin" /> : <CalendarIcon />}
        </Button>
      </PopoverTrigger>
      {popoverBody}
    </Popover>
  )

  if (hidePresets) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'flex-1 min-w-0 h-7 px-3 rounded-md border border-input bg-input/40 shadow-xs',
            'text-xs flex items-center'
          )}
        >
          <span className="truncate">{customLabel}</span>
        </div>
        {calendarButton}
      </div>
    )
  }

  if (iconOnly) {
    return <div className={cn('flex items-center', className)}>{calendarButton}</div>
  }

  return (
    <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <div className={cn('flex items-center gap-2', className)}>
        <SelectBase value={activePeriod} onValueChange={handlePeriodChange} disabled={disabled}>
          <PopoverAnchor asChild>
            <SelectTrigger
              className={cn(
                // px-2.5: respiro simétrico entre o ícone de calendário (esq.)
                // e o chevron (dir.)
                'cursor-pointer px-2.5',
                noCalendar ? 'w-full' : 'w-44',
                // Variante float: preenche o FloatCard (page actions), fundo
                // branco translúcido — mesmo visual do input search
                variant === 'float' &&
                  'data-[size=default]:h-full rounded-xl bg-white/5 border-transparent shadow-none dark:hover:bg-white/5',
                selectClassName
              )}
            >
              <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue>{activeLabel}</SelectValue>
            </SelectTrigger>
          </PopoverAnchor>
          <SelectContent align="center">
            <SelectGroup>
              {resolvedOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
              {/* Última opção: intervalo custom (abre o popover de datas).
                  onPointerUp cobre o caso do valor já ser 'custom', em que o
                  Radix não dispara onValueChange. */}
              <SelectItem value="custom" onPointerUp={openCustomPopover}>
                {t('period-custom')}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </SelectBase>
      </div>
      {popoverBody}
    </Popover>
  )
}

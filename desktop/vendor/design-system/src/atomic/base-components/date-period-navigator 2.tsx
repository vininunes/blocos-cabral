import { useCallback, useMemo } from 'react'

import { t } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

import {
  SelectBase,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select-base'

/**
 * Variantes do seletor de data da aplicação:
 * - "range" (`DateRangeSelect`): presets de período relativo (último dia,
 *   última semana…) + intervalo custom — usada em maneuvers, statistics etc.
 * - "navigator" (`DatePeriodNavigator`, este arquivo): períodos FIXOS do
 *   calendário (dia, semana do ano, mês, trimestre, semestre, ano) com as
 *   setas ‹ › embutidas no próprio trigger — usada no calendar. Sem custom.
 */

export type PeriodGranularity = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'

const GRANULARITIES: Array<{ value: PeriodGranularity; labelKey: string }> = [
  { value: 'day', labelKey: 'period-day' },
  { value: 'week', labelKey: 'period-week' },
  { value: 'month', labelKey: 'period-month' },
  { value: 'quarter', labelKey: 'period-quarter' },
  { value: 'semester', labelKey: 'period-semester' },
  { value: 'year', labelKey: 'period-year' },
]

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Período fixo do calendário contendo a data de referência: dia, semana do
 *  ano (segunda–domingo), mês, trimestre/semestre fixos do ano e ano. */
export function periodRange(
  period: PeriodGranularity,
  ref: Date = new Date()
): { from: Date; to: Date } {
  switch (period) {
    case 'day':
      return { from: startOfDay(ref), to: endOfDay(ref) }
    case 'week': {
      const monday = new Date(ref)
      monday.setDate(ref.getDate() - ((ref.getDay() + 6) % 7))
      return { from: startOfDay(monday), to: endOfDay(addDays(monday, 6)) }
    }
    case 'month':
      return {
        from: new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0),
        to: new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    case 'quarter': {
      const qStart = Math.floor(ref.getMonth() / 3) * 3
      return {
        from: new Date(ref.getFullYear(), qStart, 1, 0, 0, 0, 0),
        to: new Date(ref.getFullYear(), qStart + 3, 0, 23, 59, 59, 999),
      }
    }
    case 'semester': {
      const sStart = ref.getMonth() < 6 ? 0 : 6
      return {
        from: new Date(ref.getFullYear(), sStart, 1, 0, 0, 0, 0),
        to: new Date(ref.getFullYear(), sStart + 6, 0, 23, 59, 59, 999),
      }
    }
    case 'year':
      return {
        from: new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0),
        to: new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
  }
}

/** Desloca o período fixo uma unidade para frente/trás, re-ancorando no
 *  calendário. */
export function shiftPeriod(
  period: PeriodGranularity,
  range: { from: Date; to: Date },
  direction: 1 | -1
): { from: Date; to: Date } {
  const ref = new Date(range.from)
  switch (period) {
    case 'day':
      return periodRange('day', addDays(ref, direction))
    case 'week':
      return periodRange('week', addDays(ref, direction * 7))
    case 'month':
      ref.setMonth(ref.getMonth() + direction)
      return periodRange('month', ref)
    case 'quarter':
      ref.setMonth(ref.getMonth() + direction * 3)
      return periodRange('quarter', ref)
    case 'semester':
      ref.setMonth(ref.getMonth() + direction * 6)
      return periodRange('semester', ref)
    case 'year':
      ref.setFullYear(ref.getFullYear() + direction)
      return periodRange('year', ref)
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Label do período, sensível a hoje/ontem/amanhã, semana corrente, ano
 *  corrente e idioma. */
export function formatPeriodLabel(
  period: PeriodGranularity,
  from: Date,
  to: Date,
  lang: string
): string {
  const now = new Date()
  const monthDay = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' })
  const monthDayYear = new Intl.DateTimeFormat(lang, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (period === 'day') {
    if (sameDay(from, now)) return t('today')
    if (sameDay(from, addDays(now, -1))) return t('yesterday')
    if (sameDay(from, addDays(now, 1))) return t('tomorrow')

    const week = periodRange('week', now)
    if (from >= week.from && from <= week.to) {
      return capitalize(new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(from))
    }
    if (from.getFullYear() === now.getFullYear()) return monthDay.format(from)
    return new Intl.DateTimeFormat(lang, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(from)
  }

  if (period === 'month') {
    const month = capitalize(new Intl.DateTimeFormat(lang, { month: 'long' }).format(from))
    if (from.getFullYear() === now.getFullYear()) return month
    return `${month} ${from.getFullYear()}`
  }

  if (period === 'year') return String(from.getFullYear())

  if (period === 'week') {
    const thisWeek = periodRange('week', now)
    if (sameDay(from, thisWeek.from)) return t('this-week')
    if (sameDay(from, addDays(thisWeek.from, -7))) return t('last-week')
    if (sameDay(from, addDays(thisWeek.from, 7))) return t('next-week')
  }

  // week (demais) / quarter / semester: intervalo entre os dias
  const fmt = from.getFullYear() === now.getFullYear() ? monthDay : monthDayYear
  return `${fmt.format(from)} – ${fmt.format(to)}`
}

interface DatePeriodNavigatorProps {
  startDate: Date
  endDate: Date
  period: PeriodGranularity
  onChange: (start: Date, end: Date, period: PeriodGranularity) => void
  className?: string
  /** 'float': para uso dentro de FloatCards (page actions). */
  variant?: 'default' | 'float'
  /** Restringe as granularidades disponíveis no select (default: todas). */
  granularities?: PeriodGranularity[]
  /** Sobrescreve o rótulo central (ex.: range livre que não bate com o
   *  período fixo — o player solto após um "ir a um momento"). */
  label?: string
  /** Abertura/fechamento do dropdown de granularidade — quem monta o
   *  navegador sob hover precisa saber para não desmontá-lo com a bandeja
   *  aberta. */
  onOpenChange?: (open: boolean) => void
  /** Modo botão: o rótulo central vira um botão que dispara este callback e
   *  o dropdown de granularidade NÃO é renderizado (as setas continuam
   *  navegando). Para casos com uma única granularidade, em que trocar não
   *  faz sentido e o clique tem outro destino (ex.: "ir a um momento"). */
  onLabelClick?: () => void
}

/**
 * Variante "navigator" do seletor de data: as setas ‹ › ficam DENTRO do
 * trigger (no lugar do ícone de calendário e do chevron) e deslocam uma
 * unidade da granularidade escolhida; o dropdown troca a granularidade,
 * sempre ancorada nos períodos fixos do calendário.
 */
export function DatePeriodNavigator({
  startDate,
  endDate,
  period,
  onChange,
  className,
  variant = 'default',
  granularities,
  label: labelOverride,
  onOpenChange,
  onLabelClick,
}: DatePeriodNavigatorProps) {
  const { i18n } = useTranslation()

  const availableGranularities = granularities
    ? GRANULARITIES.filter((g) => granularities.includes(g.value))
    : GRANULARITIES

  const handlePeriodSelect = useCallback(
    (value: string) => {
      // Nova granularidade: re-ancora no período corrente (hoje)
      const { from, to } = periodRange(value as PeriodGranularity)
      onChange(from, to, value as PeriodGranularity)
    },
    [onChange]
  )

  const handleNav = useCallback(
    (direction: 1 | -1) => {
      const { from, to } = shiftPeriod(period, { from: startDate, to: endDate }, direction)
      onChange(from, to, period)
    },
    [period, startDate, endDate, onChange]
  )

  const periodLabel = useMemo(
    () => formatPeriodLabel(period, startDate, endDate, i18n.language),
    [period, startDate, endDate, i18n.language]
  )
  const label = labelOverride ?? periodLabel

  // Setas dentro do trigger: spans com pointerdown interceptado para não
  // abrir o dropdown do select (que abre em pointerdown)
  function navHandlers(direction: 1 | -1) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.stopPropagation()
        e.preventDefault()
      },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        handleNav(direction)
      },
    }
  }

  const triggerClassName = cn(
    // esconde o chevron nativo do select — as setas assumem os lados
    'cursor-pointer w-52 px-0 justify-between gap-1 [&>svg:last-child]:hidden',
    variant === 'float' &&
      'data-[size=default]:h-full rounded-xl bg-white/5 border-transparent shadow-none dark:hover:bg-white/5',
    className
  )
  const arrowClassName =
    'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted/50'
  // Box com hover no label central: sinaliza que ali abre o select de
  // granularidade (ou o destino do clique, no modo botão) — as setas dos
  // lados só navegam o período
  const centerClassName =
    'flex h-6 min-w-0 flex-1 items-center justify-center rounded-lg px-1 hover:bg-white/5'
  const labelNode = <span className="truncate text-center text-xs">{label}</span>

  if (onLabelClick) {
    // Modo botão: mesmo layout do trigger, sem Select — o centro é um botão.
    // Setas como botões reais (não há select para interceptar o pointerdown).
    return (
      <div
        data-slot="select-trigger"
        data-size="default"
        className={cn(
          'border-input bg-input/30 flex items-center rounded-md border text-xs shadow-xs data-[size=default]:h-7',
          triggerClassName
        )}
      >
        <button type="button" tabIndex={-1} className={arrowClassName} onClick={() => handleNav(-1)}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className={cn(centerClassName, 'cursor-pointer')} onClick={onLabelClick}>
          {labelNode}
        </button>
        <button type="button" tabIndex={-1} className={arrowClassName} onClick={() => handleNav(1)}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <SelectBase value={period} onValueChange={handlePeriodSelect} onOpenChange={onOpenChange}>
      <SelectTrigger className={triggerClassName}>
        <span role="button" tabIndex={-1} className={arrowClassName} {...navHandlers(-1)}>
          <ChevronLeft className="size-4" />
        </span>
        <span className={centerClassName}>
          <SelectValue>{labelNode}</SelectValue>
        </span>
        <span role="button" tabIndex={-1} className={arrowClassName} {...navHandlers(1)}>
          <ChevronRight className="size-4" />
        </span>
      </SelectTrigger>
      <SelectContent align="center">
        <SelectGroup>
          {availableGranularities.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </SelectBase>
  )
}

import { t } from 'i18next'

export interface DateRangeOption {
  value: string
  label: string
  days?: number
  hours?: number
}

export function getDefaultDateRangeOptions(): DateRangeOption[] {
  return [
    { value: '1d', label: t('period-1d'), days: 1 },
    { value: '1w', label: t('period-1w'), days: 7 },
    { value: '2w', label: t('period-2w'), days: 14 },
    { value: '3w', label: t('period-3w'), days: 21 },
    { value: '1mo', label: t('period-1mo'), days: 30 },
    { value: '2mo', label: t('period-2mo'), days: 60 },
    { value: '3mo', label: t('period-3mo'), days: 90 },
    { value: '4mo', label: t('period-4mo'), days: 120 },
    { value: '5mo', label: t('period-5mo'), days: 150 },
    { value: '6mo', label: t('period-6mo'), days: 180 },
    { value: '1y', label: t('period-1y'), days: 365 },
  ]
}

export function computePeriodDates(days: number, now = new Date()): { start: Date; end: Date } {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function computePeriodHours(
  hours: number,
  now = new Date()
): { start: Date; end: Date } {
  const end = new Date(now)
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
  return { start, end }
}

export function computePeriodFromOption(
  opt: DateRangeOption,
  now = new Date()
): { start: Date; end: Date } {
  if (opt.hours !== undefined) return computePeriodHours(opt.hours, now)
  return computePeriodDates(opt.days ?? 0, now)
}

export function detectPeriod(start: Date, end: Date, options: DateRangeOption[]): string {
  const now = new Date()
  for (const opt of options) {
    if (opt.hours !== undefined) {
      const range = computePeriodHours(opt.hours, now)
      const tolerance = 60 * 1000
      if (
        Math.abs(start.getTime() - range.start.getTime()) < tolerance &&
        Math.abs(end.getTime() - range.end.getTime()) < tolerance
      ) {
        return opt.value
      }
      continue
    }
    const range = computePeriodDates(opt.days ?? 0, now)
    if (isSameDay(start, range.start) && isSameDay(end, range.end)) return opt.value
  }
  return 'custom'
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

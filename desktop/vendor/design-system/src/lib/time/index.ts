import dayjsBase from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// Import locale data for proper translations
import 'dayjs/locale/pt-br'
import 'dayjs/locale/en'

dayjsBase.extend(utc)
dayjsBase.extend(timezone)
dayjsBase.extend(localizedFormat)
dayjsBase.extend(relativeTime)
dayjsBase.extend(advancedFormat)

export const dayjs = dayjsBase

export type SupportedLocale = 'en' | 'pt-br'

export function mapSettingsLanguageToDayjsLocale(language: 'en-US' | 'pt-BR'): SupportedLocale {
  switch (language) {
    case 'pt-BR':
      return 'pt-br'
    case 'en-US':
    default:
      return 'en'
  }
}

export type SupportedTimezone = 'utc' | 'local-time'

export function getDayjs(date?: Date | number | string, tz: SupportedTimezone = 'local-time') {
  // If no date provided, use current time
  if (!date) {
    return tz === 'utc' ? dayjs.utc() : dayjs()
  }

  // Handle Date objects
  if (date instanceof Date) {
    return tz === 'utc' ? dayjs.utc(date) : dayjs(date)
  }

  // Handle timestamps (numbers)
  if (typeof date === 'number') {
    return tz === 'utc' ? dayjs.utc(date) : dayjs(date)
  }

  // Handle ISO strings - Backend sends UTC timestamps WITHOUT 'Z' suffix
  // We need to add 'Z' to explicitly mark them as UTC, then create a Date object
  // This matches the original working implementation
  if (
    typeof date === 'string' &&
    !date.endsWith('Z') &&
    !date.includes('+') &&
    date.includes('T')
  ) {
    // Add 'Z' to force UTC interpretation, wrap in Date object for consistent parsing
    const dateWithZ = new Date(`${date}Z`)
    return tz === 'utc' ? dayjs.utc(dateWithZ) : dayjs(dateWithZ)
  }

  // For strings that already have timezone info, parse directly
  return tz === 'utc' ? dayjs.utc(date) : dayjs(date)
}

export function formatPatternsForTime(options?: { withSeconds?: boolean; hour12?: boolean }) {
  const base = options?.hour12 ? 'h:mm' : 'HH:mm'
  const suffix = options?.hour12 ? ' A' : ''
  const seconds = options?.withSeconds ? ':ss' : ''
  return `${base}${seconds}${suffix}`
}

export function dateStyleToToken(style?: 'short' | 'medium' | 'long' | 'full'): string {
  switch (style) {
    case 'short':
      return 'L'
    case 'long':
      return 'LL'
    case 'full':
      return 'LLLL'
    case 'medium':
    default:
      return 'll'
  }
}

/** Rótulo da janela "acabou de acontecer" — no lugar do "a few seconds ago" /
 * "há poucos segundos" do dayjs (tudo abaixo de ~45s cai nesse balde). */
const JUST_NOW_LABEL: Record<SupportedLocale, string> = {
  en: 'now',
  'pt-br': 'agora',
}

export function formatRelativeTime(
  date: Date | number | string,
  tz: SupportedTimezone,
  locale: SupportedLocale
): string {
  const d = getDayjs(date, tz)
  // Diferença numérica contra Date.now(): antes alocava um segundo dayjs (com
  // fuso) por chamada, por linha, a cada segundo.
  if (Math.abs(d.valueOf() - Date.now()) < 45_000) {
    return JUST_NOW_LABEL[locale] ?? JUST_NOW_LABEL.en
  }
  return d.locale(locale).fromNow()
}

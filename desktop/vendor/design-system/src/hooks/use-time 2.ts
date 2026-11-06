import { useCallback, useMemo, useRef } from 'react'

import { atom, useAtomValue } from 'jotai'

import { useSettings } from '@/atomic/features/settings/hooks/use-settings'

import {
  dateStyleToToken,
  formatPatternsForTime,
  formatRelativeTime as formatRelativeTimeLib,
  getDayjs,
  mapSettingsLanguageToDayjsLocale,
} from '@/lib/time'

const nowAtom = atom<number>(Date.now())
nowAtom.onMount = (set) => {
  // Pausa com a aba oculta (nada é desenhado; cada tick re-renderizava todos os
  // assinantes à toa) e, ao voltar, atualiza na hora e retoma o intervalo.
  let id: ReturnType<typeof setInterval> | null = null
  const start = () => {
    if (id !== null) return
    set(Date.now())
    id = setInterval(() => set(Date.now()), 1000)
  }
  const stop = () => {
    if (id === null) return
    clearInterval(id)
    id = null
  }
  const onVisibilityChange = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (!document.hidden) start()
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stop()
  }
}

const staticAtom = atom<number>(Date.now())

/**
 * "Agora" quantizado em 30 s, derivado do relógio compartilhado de 1 s: quem
 * só precisa de resolução de 30 s (opacidade/lost de vessel) re-renderiza a
 * cada 30 s, sem criar um setInterval próprio.
 */
export const now30sMsAtom = atom((get) => Math.floor(get(nowAtom) / 30_000) * 30_000)

/** "Agora" quantizado no minuto (mesmo relógio compartilhado). */
export const nowMinuteMsAtom = atom((get) => Math.floor(get(nowAtom) / 60_000) * 60_000)

export type SupportedTimezone = 'utc' | 'local-time'

export type TimeFormatOptions = {
  withSeconds?: boolean
  hour12?: boolean
}

export type DateTimeFormatOptions = TimeFormatOptions & {
  dateStyle?: 'short' | 'medium' | 'long' | 'full'
  timeStyle?: 'short' | 'medium' | 'long' | 'full'
}

export interface UseTime {
  now: Date
  nowMs: number
  timezone: SupportedTimezone
  /** Rótulo curto do fuso exibido ao lado de horários: 'UTC' ou 'LT' (local time). */
  timezoneLabel: 'UTC' | 'LT'
  clockEnabled: boolean
  locale: string
  formatTime: (date?: Date | number | string, options?: TimeFormatOptions) => string
  formatDate: (
    date?: Date | number | string,
    options?: { dateStyle?: 'short' | 'medium' | 'long' | 'full' }
  ) => string
  formatDateTime: (date?: Date | number | string, options?: DateTimeFormatOptions) => string
  formatRelativeTime: (date?: Date | number | string) => string
  toUserISO: (date?: Date | number | string) => string
  toUTCISO: (date?: Date | number | string) => string
}

export function useTime(options?: { live?: boolean }): UseTime {
  const { getSetting } = useSettings()

  const timezone = getSetting('timezone')
  const clockEnabled = getSetting('clock_enable')
  const language = getSetting('language')
  // Default do hour12 vem da setting (24h por padrão); options?.hour12
  // explícito continua vencendo.
  const twentyFourHourTime = getSetting('twenty_four_hour_time')

  const live = options?.live ?? false
  const nowMs = useAtomValue(live ? nowAtom : staticAtom)

  const locale = useMemo(() => mapSettingsLanguageToDayjsLocale(language), [language])

  // "Agora" por ref: formatters que só usam o agora como DEFAULT (sem data)
  // ficam com identidade estável entre os ticks de 1 s. Antes todos eram
  // closures novas a cada render: memos de colunas/labels/TextLayer que os têm
  // nas deps recomputavam em todo render (com live: true, a cada segundo).
  const nowRef = useRef(nowMs)
  nowRef.current = nowMs
  const hour12Default = !twentyFourHourTime

  const formatters = useMemo(() => {
    const formatTime = (date?: Date | number | string, options?: TimeFormatOptions): string => {
      const d = getDayjs(date ?? nowRef.current, timezone).locale(locale)
      const pattern = formatPatternsForTime({ hour12: hour12Default, ...options })
      return d.format(pattern)
    }

    const formatDate = (
      date?: Date | number | string,
      options?: { dateStyle?: 'short' | 'medium' | 'long' | 'full' }
    ): string => {
      const d = getDayjs(date ?? nowRef.current, timezone).locale(locale)
      const pattern = dateStyleToToken(options?.dateStyle ?? 'medium')
      return d.format(pattern)
    }

    const formatDateTime = (
      date?: Date | number | string,
      options?: DateTimeFormatOptions
    ): string => {
      const d = getDayjs(date ?? nowRef.current, timezone).locale(locale)
      const datePart = dateStyleToToken(options?.dateStyle ?? 'medium')
      const timePart = formatPatternsForTime({
        withSeconds:
          options?.withSeconds ?? (options?.timeStyle === 'long' || options?.timeStyle === 'full'),
        hour12: options?.hour12 ?? hour12Default,
      })
      return d.format(`${datePart} ${timePart}`)
    }

    const toUserISO = (date?: Date | number | string): string => {
      const base = getDayjs(date ?? nowRef.current, timezone)
      return timezone === 'utc' ? base.utc().toISOString() : base.format('YYYY-MM-DDTHH:mm:ssZ')
    }

    const toUTCISO = (date?: Date | number | string): string => {
      const base = getDayjs(date ?? nowRef.current, 'utc')
      return base.utc().toISOString()
    }

    return { formatTime, formatDate, formatDateTime, toUserISO, toUTCISO }
  }, [timezone, locale, hour12Default])

  // Relativo depende do agora: muda de identidade a cada tick (com live), que
  // é o que faz os textos "há X s" atualizarem.
  const formatRelativeTime = useCallback(
    (date?: Date | number | string): string =>
      formatRelativeTimeLib(date ?? nowMs, timezone, locale),
    [nowMs, timezone, locale]
  )

  return {
    now: useMemo(() => new Date(nowMs), [nowMs]),
    nowMs,
    timezone,
    timezoneLabel: timezone === 'utc' ? 'UTC' : 'LT',
    clockEnabled,
    locale,
    ...formatters,
    formatRelativeTime,
  }
}

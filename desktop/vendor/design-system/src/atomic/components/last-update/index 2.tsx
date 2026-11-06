import { useMemo, useRef } from 'react'

import { t } from 'i18next'
import { useAtom, useAtomValue } from 'jotai'
import { History } from 'lucide-react'

import Tooltip from '@/atomic/base-components/tooltip'

import {
  playerActiveAtom,
  playerCurrentSecondMsAtom,
} from '@/atomic/features/player/store/player-state'

import { useTime } from '@/hooks/use-time'

import { cn } from '@/lib/tailwind/utils'
import { getDayjs } from '@/lib/time'

import { lastUpdateAbsoluteAtom } from './last-update-state'

export function LastUpdate({
  date,
  className,
  showIndicator = true,
  showText = true,
  frequency = false,
  withAbsolute = false,
}: {
  date: string | undefined
  showIndicator?: boolean
  showText?: boolean
  frequency?: boolean
  /** Padrão dos popups do mapa: tempo RELATIVO seguido do ABSOLUTO,
   * "5 minutes ago · 07/10/26 14:32" (sem o alternar do player). */
  withAbsolute?: boolean
  className?: string
}) {
  const { nowMs, formatDateTime, timezoneLabel } = useTime({ live: true })
  // Segundo quantizado: o texto relativo tem resolução de segundo.
  const playerActive = useAtomValue(playerActiveAtom)
  const playerSecondMs = useAtomValue(playerCurrentSecondMsAtom)
  // Com o player ativo o indicador alterna (clique) entre o relativo à agulha
  // e a hora absoluta da posição; fora do player é sempre relativo ao "agora".
  const [absolute, setAbsolute] = useAtom(lastUpdateAbsoluteAtom)
  const showAbsolute = playerActive && absolute
  const lastTimesRef = useRef<number[]>([])
  const prevTimeRef = useRef<number>(0)

  // Referência numérica (não um objeto dayjs novo por render, que invalidava o memo).
  const referenceMs = playerActive ? playerSecondMs : nowMs

  const hasDate = Boolean(date)

  const time = useMemo(() => {
    if (!date) {
      // Sem dado: descarta o histórico de frequência (senão mistura com o
      // próximo vessel/dado que chegar).
      lastTimesRef.current = []
      prevTimeRef.current = 0
      return 0
    }
    const secondFromNow = getDayjs(referenceMs).diff(getDayjs(date), 'seconds')

    if (frequency && prevTimeRef.current > secondFromNow) {
      const times = [...lastTimesRef.current]
      if (times.length >= 5) times.shift()
      times.push(prevTimeRef.current)
      lastTimesRef.current = times
    }

    prevTimeRef.current = secondFromNow
    return secondFromNow
  }, [date, frequency, referenceMs])

  const updateFrequency = useMemo(() => {
    const lastTimes = lastTimesRef.current
    if (lastTimes.length === 0) return undefined

    const frequencyHz = lastTimes.length / lastTimes.reduce((sum, t) => sum + t, 0)

    if (frequencyHz < 0.01) return `${(frequencyHz * 100).toFixed(1)} cHz`

    return `${frequencyHz.toFixed(1)} Hz`
    // `time` é o gatilho: recalcula depois que o memo acima atualiza o ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time])

  const tooltipText = playerActive
    ? `${t(showAbsolute ? 'player-time-absolute' : 'player-time-relative')} (${timezoneLabel}) · ${t('player-time-toggle-hint')}`
    : (updateFrequency ?? '')

  const tooltipDisabled =
    !hasDate || (!playerActive && (!frequency || updateFrequency === undefined))

  // Sem data não há "há 0 segundos": mostra "-" e o indicador apagado.
  const relativeText = !hasDate
    ? '-'
    : time < 0
      ? Math.abs(time) <= 59
        ? `in ${Math.abs(time)} seconds`
        : Math.abs(time) < 3600
          ? `in ${Math.floor(Math.abs(time) / 60)} minutes`
          : Math.abs(time) < 86400
            ? `in ${Math.floor(Math.abs(time) / 3600)} hours`
            : `in ${Math.floor(Math.abs(time) / 86400)} days`
      : time <= 59
        ? `${time} seconds ago`
        : time < 3600
          ? `${Math.floor(time / 60)} minutes ago`
          : time < 86400
            ? `${Math.floor(time / 3600)} hours ago`
            : `${Math.floor(time / 86400)} days ago`

  const absoluteText = date ? (
    <>
      {formatDateTime(date, { dateStyle: 'short', withSeconds: true })}{' '}
      <span className="text-[10px] text-muted-foreground">{timezoneLabel}</span>
    </>
  ) : (
    '-'
  )

  return (
    <Tooltip disabled={tooltipDisabled} text={tooltipText}>
      <div className={cn('flex justify-end items-center gap-2 w-fit', className)}>
        {showText && withAbsolute && hasDate ? (
          <p className="w-fit text-xs tabular-nums">
            <span className="font-medium">{relativeText}</span>
            <span className="text-muted-foreground">
              {' · '}
              {formatDateTime(date, { dateStyle: 'short', withSeconds: false })}
            </span>
          </p>
        ) : (
          showText &&
          (playerActive && hasDate ? (
            <button
              type="button"
              className="text-xs w-fit tabular-nums cursor-pointer rounded-sm hover:underline underline-offset-2"
              onClick={(event) => {
                // o indicador vive dentro de cards/popups clicáveis
                event.stopPropagation()
                setAbsolute((prev) => !prev)
              }}
            >
              {showAbsolute ? absoluteText : relativeText}
            </button>
          ) : (
            <p className="text-xs w-fit">{relativeText}</p>
          ))
        )}

        {playerActive ? (
          <History size={12} className="text-muted-foreground" />
        ) : (
          showIndicator && (
            <span
              className={cn(
                'relative w-3 h-3 rounded-full',
                hasDate ? 'bg-positive' : 'bg-muted-foreground/40'
              )}
            >
              {hasDate && (
                <span
                  className={cn(
                    'absolute w-3 h-3 rounded-full animate-color bg-positive',
                    time < 10 ? 'animate-ping' : 'animate-none'
                  )}
                />
              )}
            </span>
          )
        )}
      </div>
    </Tooltip>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Settings } from '../models/settings'
import type { SettingKey } from '../store/settings-state'
import { useSettings } from './use-settings'

/** Intervalo entre escritas no settingsState durante um arrasto. */
const SETTING_DRAFT_THROTTLE_MS = 100

/**
 * Setting editado por controle CONTÍNUO (slider, ColorPicker).
 *
 * Antes cada passo do arrasto (pointermove) chamava `handleSettings`: escrita
 * global no settingsState e rebuild das layers que leem a chave, dezenas de
 * vezes por segundo. Aqui o valor exibido é um rascunho local (thumb/cor
 * respondem na hora) e a escrita é limitada a uma a cada 100 ms, com flush
 * imediato no `commit` (fim do arrasto) e no unmount — o mapa continua com
 * pré-visualização ao vivo, só que em ~10 Hz.
 */
export function useThrottledSetting<K extends SettingKey>(key: K) {
  const { getSetting, handleSettings } = useSettings()
  const stored = getSetting(key)
  const [draft, setDraft] = useState<{ value: Settings[K] } | null>(null)

  const pendingRef = useRef<{ value: Settings[K] } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSettingsRef = useRef(handleSettings)
  useEffect(() => {
    handleSettingsRef.current = handleSettings
  }, [handleSettings])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    handleSettingsRef.current(key, pending.value)
    // O valor gravado é o mais recente: o rascunho já não é necessário.
    setDraft(null)
  }, [key])

  const setValue = useCallback(
    (value: Settings[K]) => {
      setDraft({ value })
      pendingRef.current = { value }
      if (!timerRef.current) timerRef.current = setTimeout(flush, SETTING_DRAFT_THROTTLE_MS)
    },
    [flush]
  )

  const commit = useCallback(
    (value?: Settings[K]) => {
      if (value !== undefined) pendingRef.current = { value }
      flush()
    },
    [flush]
  )

  useEffect(() => flush, [flush])

  return [draft ? draft.value : stored, setValue, commit] as const
}

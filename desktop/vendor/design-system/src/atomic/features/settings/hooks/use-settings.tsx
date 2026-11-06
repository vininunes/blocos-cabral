import { useCallback, useEffect, useReducer, useRef } from 'react'

import { useSetAtom, useStore } from 'jotai'

import { persistMapTheme } from '../helpers/map-theme-storage'
import { scheduleSettingsSync } from '../helpers/settings-sync'
import { type Settings } from '../models/settings'
import type { SyncableSettingKey } from '../models/settings-api'
import { type SettingKey, type SettingStateTypes, settingsState } from '../store/settings-state'

// Keys that should not be synced with backend
const CLIENT_ONLY_KEYS: SettingKey[] = ['user', 'projection']

function isSyncableKey(key: SettingKey): key is SyncableSettingKey {
  return !CLIENT_ONLY_KEYS.includes(key)
}

/**
 * Acesso às settings com assinatura POR CHAVE LIDA.
 *
 * Antes cada um dos ~90 consumidores assinava o Map inteiro: qualquer
 * `handleSettings` (inclusive por pointermove de slider/ColorPicker) re-renderizava
 * todos, com rebuild de layers do mapa. Agora o hook registra as chaves lidas via
 * `getSetting` (durante o render, memos, effects ou handlers — o conjunto só
 * cresce) e só re-renderiza quando uma DELAS muda.
 *
 * `getSetting` muda de identidade exatamente quando uma chave lida muda, então
 * memos/effects com `getSetting` nas deps continuam recomputando como antes.
 */
export function useSettings(): {
  getSetting: <K extends SettingKey>(key: K) => Settings[K]
  handleSettings: <K extends SettingKey>(key: K, data: Settings[K]) => void
} {
  const store = useStore()
  const setSettings = useSetAtom(settingsState)
  const readKeysRef = useRef<Set<SettingKey>>(new Set())
  const [version, bumpVersion] = useReducer((v: number) => v + 1, 0)
  // Snapshot visto no último render: base da comparação na assinatura.
  const renderedRef = useRef<SettingStateTypes>(store.get(settingsState))
  renderedRef.current = store.get(settingsState)

  useEffect(() => {
    const changedReadKey = (prev: SettingStateTypes, next: SettingStateTypes) => {
      for (const key of readKeysRef.current) {
        if (!Object.is(prev.get(key), next.get(key))) return true
      }
      return false
    }
    let last = renderedRef.current
    const unsubscribe = store.sub(settingsState, () => {
      const next = store.get(settingsState)
      const prev = last
      last = next
      if (prev !== next && changedReadKey(prev, next)) bumpVersion()
    })
    // Mudança entre o render e a assinatura.
    const current = store.get(settingsState)
    if (current !== last) {
      const prev = last
      last = current
      if (changedReadKey(prev, current)) bumpVersion()
    }
    return unsubscribe
  }, [store])

  const getSetting = useCallback(
    <K extends SettingKey>(key: K): Settings[K] => {
      readKeysRef.current.add(key)
      return store.get(settingsState).get(key) as Settings[K]
    },
    // `version` é o gatilho de identidade (ver doc acima).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, version]
  )

  const handleSettings = useCallback(
    <K extends SettingKey>(key: K, value: Settings[K]) => {
      // Update local state immediately (optimistic update)
      setSettings((prev) => {
        // Mesmo valor: mantém a referência (nenhum consumidor é notificado).
        if (Object.is(prev.get(key), value)) return prev
        const next = new Map(prev)
        next.set(key, value)
        return next
      })

      // Espelha o tema do mapa no localStorage para o boot frio (tela de carregamento).
      if (key === 'map_theme') persistMapTheme(value as Settings['map_theme'])

      // Only sync syncable keys to backend
      if (!isSyncableKey(key)) return

      // Sync com debounce GLOBAL (settings-sync): alterações de qualquer
      // chave/componente são acumuladas e enviadas num único PUT após um
      // período sem mudanças — sem flood de requests. Por ser um buffer de
      // módulo, o timer sobrevive ao unmount do componente (com flush
      // best-effort ao ocultar/fechar a aba).
      scheduleSettingsSync({ [key]: value })
    },
    [setSettings]
  )

  return {
    getSetting,
    handleSettings,
  }
}

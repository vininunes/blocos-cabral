import { queryClient } from '@/services/query-client'

import { httpUpdateUserSettings } from '../api/http-settings'
import type { UserSettingsRequest, UserSettingsResponse } from '../models/settings-api'

// Mesmo valor de use-settings-queries — mantidos em sincronia via import lá.
export const SETTINGS_QUERY_KEY = ['user-settings']

const SYNC_DEBOUNCE_MS = 3000
const RETRY_DELAY_MS = SYNC_DEBOUNCE_MS * 2

let pending: UserSettingsRequest = {}
let timer: ReturnType<typeof setTimeout> | null = null

/**
 * Debounce GLOBAL do sync de user-settings: acumula todas as chaves alteradas
 * (de qualquer componente) num único buffer e envia UM `PUT /user-settings`
 * depois de um período sem novas alterações — evita flood de requests quando
 * o usuário mexe em vários controles em sequência (sliders, switches...).
 *
 * O estado local (jotai) é atualizado imediatamente pelos callers; apenas a
 * persistência no backend é adiada.
 */
export function scheduleSettingsSync(partial: UserSettingsRequest): void {
  pending = { ...pending, ...partial }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void flushSettingsSync(), SYNC_DEBOUNCE_MS)
}

/** Envia imediatamente o que estiver pendente (usado no debounce e no
 *  best-effort de fechamento/ocultação da aba). */
export async function flushSettingsSync(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }

  const payload = pending
  pending = {}
  if (Object.keys(payload).length === 0) return

  try {
    const data = await httpUpdateUserSettings(payload)
    queryClient.setQueryData<UserSettingsResponse>(SETTINGS_QUERY_KEY, (old) => ({
      ...old,
      ...data,
    }))
  } catch (error) {
    console.error('[settings-sync] Failed to sync user settings:', error)
    // Devolve as chaves que falharam ao buffer sem sobrescrever alterações
    // mais novas feitas enquanto a request estava em voo, e agenda um retry.
    pending = { ...payload, ...pending }
    if (!timer) {
      timer = setTimeout(() => void flushSettingsSync(), RETRY_DELAY_MS)
    }
  }
}

// Best-effort: descarrega pendências quando a aba é ocultada/fechada, para a
// última alteração do usuário não se perder no debounce.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSettingsSync()
  })
}

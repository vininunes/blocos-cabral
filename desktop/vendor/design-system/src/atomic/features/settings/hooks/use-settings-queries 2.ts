import { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'

import { isUserSelectableUnit, type UnitDimension } from '@/lib/uom'

import { httpGetUserSettings } from '../api/http-settings'
import { normalizeMapTheme, persistMapTheme } from '../helpers/map-theme-storage'
import { SETTINGS_QUERY_KEY } from '../helpers/settings-sync'
import { mapThemeReadyState, settingsState, type SettingKey } from '../store/settings-state'

// Settings de unidade → dimensão da allowlist náutica (lib/uom). Valor persistido
// fora da allowlist (ex.: `mph`, `ha`, `MN` escolhidos antes da restrição) é
// ignorado e o default náutico permanece.
const UNIT_SETTING_DIMENSION: Partial<Record<SettingKey, UnitDimension>> = {
  speed_unit: 'speed',
  distance_unit: 'distance',
  depth_unit: 'depth',
  angle_unit: 'angle',
  area_unit: 'area',
  power_unit: 'power',
  force_unit: 'force',
  vessel_length_unit: 'length',
  temperature_unit: 'temperature',
  pressure_unit: 'pressure',
}

export function useUserSettingsQuery() {
  const setSettings = useSetAtom(settingsState)
  const setMapThemeReady = useSetAtom(mapThemeReadyState)

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: httpGetUserSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents stale data after re-login
    retry: 2,
    throwOnError: false, // Don't propagate errors to error boundary
  })

  // Apply settings to Jotai state when data is fetched
  useEffect(() => {
    if (query.data) {
      // Após cada PUT o sync grava a resposta no cache (data com identidade
      // nova): sem mudança real de valor, mantém a referência do Map e nenhum
      // consumidor de settings é notificado.
      setSettings((prev) => {
        let next: typeof prev | null = null
        const put = (key: SettingKey, value: unknown) => {
          if (Object.is(prev.get(key), value)) return
          next ??= new Map(prev)
          next.set(key, value as never)
        }
        for (const [key, value] of Object.entries(query.data)) {
          if (value === undefined || value === null) continue
          // Tema do mapa: valores legados persistidos no backend (ex.: `streets`) são
          // migrados; valores desconhecidos mantêm o default em vez de quebrar `MAP_THEME[...]`.
          if (key === 'map_theme') {
            const theme = normalizeMapTheme(value)
            if (theme) put(key, theme)
            continue
          }
          const unitDimension = UNIT_SETTING_DIMENSION[key as SettingKey]
          if (unitDimension && !isUserSelectableUnit(unitDimension, value)) continue
          put(key as SettingKey, value)
        }
        return next ?? prev
      })

      // Persiste o tema do mapa vindo do backend para a tela de carregamento do próximo boot.
      const backendTheme = normalizeMapTheme(query.data.map_theme)
      if (backendTheme) persistMapTheme(backendTheme)
    }
  }, [query.data, setSettings])

  // Libera o mapa da tela de carregamento assim que a query assenta. No sucesso o tema já é o
  // do usuário; no erro liberamos mesmo assim para não travar o loading sem mapa (cai no
  // default / último tema persistido).
  useEffect(() => {
    if (query.isSuccess || query.isError) setMapThemeReady(true)
  }, [query.isSuccess, query.isError, setMapThemeReady])

  return query
}

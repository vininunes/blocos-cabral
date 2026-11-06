import { useEffect } from 'react'

import { isLightMapTheme } from '@/atomic/features/map/constants/map-themes'

import { useSettings } from '../hooks/use-settings'

// Temas de mapa "claros" → backdrop claro; os demais (dark/satellite) → escuro.
const BACKDROP_LIGHT = '#6bc8eb'
const BACKDROP_DARK = '#202020'

// Aplica a cor do backdrop da aplicação (body) conforme o TEMA DO MAPA do
// usuário — persistido em localStorage (`ds:map_theme`) e hidratado em
// `settingsState`. Reage a trocas de tema em runtime. Não renderiza nada.
export function MapThemeBackdrop() {
  // Só a chave map_theme (useSettings assina por chave lida): antes assinava o
  // Map inteiro de settings.
  const { getSetting } = useSettings()
  const mapTheme = getSetting('map_theme')

  useEffect(() => {
    document.body.style.backgroundColor = isLightMapTheme(mapTheme) ? BACKDROP_LIGHT : BACKDROP_DARK
  }, [mapTheme])

  return null
}

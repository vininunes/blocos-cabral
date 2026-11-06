import type { Settings } from '../models/settings'

// Persistência local do tema do mapa. No boot frio o atom `settingsState` ainda está no
// default (`vanilla`) porque as settings do usuário só chegam via query assíncrona. A tela
// de carregamento (`<Suspense fallback={<Loading />}>`) monta o `MapOnline` antes disso e,
// sem esta persistência, apareceria sempre em `vanilla` ignorando o tema salvo. Guardamos o
// último tema conhecido no localStorage para que o atom já inicialize com ele.
const MAP_THEME_STORAGE_KEY = 't2s:map_theme'

type MapThemeValue = Settings['map_theme']

const VALID_MAP_THEMES: MapThemeValue[] = ['vanilla', 'streets', 'dark', 'satellite']

// Valores que chegaram a ser persistidos e não são mais válidos → valor atual.
// As chaves seguem as antigas (`streets` = tema claro "Light") até a API mudar.
const LEGACY_MAP_THEMES: Record<string, MapThemeValue> = {
  light: 'streets',
}

/**
 * Normaliza um valor de tema vindo de fora (localStorage, backend): aceita os
 * valores atuais, migra os legados e devolve `null` para qualquer outra coisa.
 */
export function normalizeMapTheme(value: unknown): MapThemeValue | null {
  if (typeof value !== 'string') return null
  if (VALID_MAP_THEMES.includes(value as MapThemeValue)) return value as MapThemeValue
  return LEGACY_MAP_THEMES[value] ?? null
}

export function readPersistedMapTheme(): MapThemeValue | null {
  try {
    return normalizeMapTheme(localStorage.getItem(MAP_THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function persistMapTheme(value: MapThemeValue): void {
  try {
    localStorage.setItem(MAP_THEME_STORAGE_KEY, value)
  } catch {
    // Ignora falhas de localStorage (modo privado / quota) — persistência é best-effort.
  }
}

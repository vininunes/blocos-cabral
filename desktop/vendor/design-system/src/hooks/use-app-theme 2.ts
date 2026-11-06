import { useEffect, useState } from 'react'

import { useSettings } from '@/atomic/features/settings/hooks/use-settings'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * Tema EFETIVO da aplicação (claro/escuro) a partir do setting `app_theme`,
 * resolvendo `system` pela preferência do SO e reagindo quando ela muda.
 * É o mesmo critério de `setTheme` (classe `dark` no `<html>`).
 */
export function useAppThemeIsDark(): boolean {
  const { getSetting } = useSettings()
  const appTheme = getSetting('app_theme') ?? 'light'

  const [prefersDark, setPrefersDark] = useState<boolean>(
    () => window.matchMedia?.(DARK_MEDIA_QUERY).matches ?? false
  )

  useEffect(() => {
    const media = window.matchMedia?.(DARK_MEDIA_QUERY)
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return appTheme === 'system' ? prefersDark : appTheme === 'dark'
}

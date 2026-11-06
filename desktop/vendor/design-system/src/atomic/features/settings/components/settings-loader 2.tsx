import { useEffect } from 'react'

import { useTheme } from '@/atomic/base-components/theme-provider'

import { setLanguage } from '@/translation/set-language'

import { useUserSettingsQuery } from '../hooks/use-settings-queries'

export function SettingsLoader() {
  const { data, isSuccess } = useUserSettingsQuery()
  const { setTheme } = useTheme()

  // Deps pelos VALORES: após cada PUT o cache recebe um `data` novo, e com
  // `data` nas deps o i18n.changeLanguage (re-render de todo useTranslation) e o
  // setTheme rodavam a cada ajuste de QUALQUER setting.
  const appTheme = isSuccess ? data?.app_theme : undefined
  const language = isSuccess ? data?.language : undefined

  // Sync theme and language when settings are loaded from API
  useEffect(() => {
    if (appTheme) setTheme(appTheme)
  }, [appTheme, setTheme])

  useEffect(() => {
    if (language) void setLanguage(language)
  }, [language])

  return null
}

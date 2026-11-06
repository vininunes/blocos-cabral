type Theme = 'dark' | 'light' | 'system'

export function setTheme(theme: Theme, storageKey = 'theme') {
  if (theme === 'system') {
    localStorage.removeItem(storageKey)
  } else {
    localStorage.setItem(storageKey, theme)
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

  const isDark = theme === 'system' ? prefersDark : theme === 'dark'

  document.documentElement.classList.toggle('dark', isDark)

  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

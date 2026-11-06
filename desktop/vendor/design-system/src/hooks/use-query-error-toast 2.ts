import { useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type QueryErrorToastOptions = {
  /** Context label used in the console error, e.g. 'useEmissionQuery'. Dev-only, not translated. */
  label: string
  /** Console message printed after the label. Defaults to 'Failed:'. Dev-only, not translated. */
  logMessage?: string
  /** i18n key for the user-facing toast. Omit to log only (no toast shown). */
  toastKey?: string
}

/**
 * Logs (and optionally toasts) a TanStack Query error.
 *
 * Replaces the repeated `useEffect(() => { if (query.error) { ... } }, [query.error])`
 * boilerplate spread across query hooks. The user-facing toast is resolved through i18n.
 *
 * @example
 * const query = useQuery({ ... })
 * useQueryErrorToast(query.error, {
 *   label: 'useEmissionQuery',
 *   toastKey: 'emission-error-load-vessels',
 * })
 */
export function useQueryErrorToast(
  error: unknown,
  { label, logMessage = 'Failed:', toastKey }: QueryErrorToastOptions
) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!error) return
    console.error(`[${label}] ${logMessage}`, error)
    if (toastKey) toast.error(t(toastKey))
  }, [error, label, logMessage, toastKey, t])
}

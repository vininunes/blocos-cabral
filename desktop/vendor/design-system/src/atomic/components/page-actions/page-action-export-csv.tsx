import { t } from 'i18next'
import { Download } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * Export CSV de uma tabela como page action (header do Pages) — float card
 * reutilizável; a página fornece o handler de exportação.
 */
export function PageActionExportCsv({
  onExport,
  disabled = false,
  label,
}: {
  onExport: () => void
  disabled?: boolean
  /** Rótulo do botão — `t('export-csv')` quando omitido. */
  label?: string
}) {
  return (
    <FloatCard className="flex h-9 items-center">
      <Button
        variant="ghost"
        size="sm"
        className="h-full rounded-xl"
        onClick={onExport}
        disabled={disabled}
      >
        <Download className="size-3.5" />
        {label ?? t('export-csv')}
      </Button>
    </FloatCard>
  )
}

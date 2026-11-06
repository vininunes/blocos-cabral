import { t } from 'i18next'

import { ConfirmationDialog } from '@/atomic/base-components/confirmation-dialog'

import type { UnsavedChangesPrompt } from '@/hooks/use-unsaved-changes-guard'

/**
 * Diálogo padrão de "descartar alterações não salvas?" — par dos hooks de
 * `use-unsaved-changes-guard` (saída de rota ou ação dentro da página).
 * Fechar pelo X/Esc/fora = ficar.
 */
export function UnsavedChangesDialog({
  prompt,
  description = t('unsaved-changes-warning'),
  confirmLabel = t('discard'),
}: {
  prompt: UnsavedChangesPrompt
  description?: string
  confirmLabel?: string
}) {
  return (
    <ConfirmationDialog
      open={prompt.open}
      onOpenChange={(open) => !open && prompt.cancel()}
      title={t('unsaved-changes-title')}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={t('unsaved-changes-stay')}
      onConfirm={prompt.confirm}
      variant="destructive"
    />
  )
}

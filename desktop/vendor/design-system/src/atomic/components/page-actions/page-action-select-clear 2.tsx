import { t } from 'i18next'
import { ChevronDown, X } from 'lucide-react'

/**
 * Cauda do trigger dos selects ricos das page actions (frota, porto):
 * chevron por padrão; com `deselect` informado e seleção ativa vira um X que
 * limpa a seleção — sem abrir a bandeja do dropdown.
 */
export function PageActionSelectTail({
  deselect,
  hasSelection,
}: {
  /** Limpa a seleção atual. Sem callback, a cauda é sempre o chevron. */
  deselect?: () => void
  hasSelection: boolean
}) {
  if (!deselect || !hasSelection) {
    return <ChevronDown className="size-4 shrink-0 opacity-50" />
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={t('select-clear')}
      className="shrink-0 cursor-pointer rounded-md opacity-50 transition-opacity hover:opacity-100"
      onPointerDown={(event) => {
        // O trigger do dropdown abre no pointerdown — segura o evento para o
        // X limpar a seleção sem abrir a bandeja.
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
        deselect()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          deselect()
        }
      }}
    >
      <X className="size-4" />
    </span>
  )
}

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { cn } from '@/lib/tailwind/utils'

type ConfirmationVariant = 'default' | 'destructive' | 'warning' | 'positive'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: ConfirmationVariant
  /** Conteúdo extra entre a descrição e o rodapé (ex.: relação de itens). */
  children?: React.ReactNode
}

// Ícone de status no header: destructive/warning alertam, positive confirma.
const VARIANT_ICON: Partial<
  Record<ConfirmationVariant, { Icon: typeof AlertTriangle; className: string }>
> = {
  destructive: { Icon: AlertTriangle, className: 'bg-destructive/10 text-destructive' },
  warning: { Icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
  positive: { Icon: CheckCircle2, className: 'bg-positive/15 text-positive' },
}

const VARIANT_CONFIRM_CLASS: Partial<Record<ConfirmationVariant, string>> = {
  warning: 'bg-warning hover:bg-warning/90 text-white',
  positive: 'bg-positive hover:bg-positive/90 text-white',
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default',
  children,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    onOpenChange(false)
  }

  const icon = VARIANT_ICON[variant]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  icon.className
                )}
              >
                <icon.Icon className="h-5 w-5" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1 sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className={cn('flex-1 sm:flex-none', VARIANT_CONFIRM_CLASS[variant])}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

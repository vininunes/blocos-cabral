import { useState } from 'react'

import { t } from 'i18next'
import { LogOutIcon } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { Checkbox } from '@/atomic/base-components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/atomic/base-components/dialog'

// Flag persistida: quando true, o logout não pede confirmação.
const SKIP_LOGOUT_CONFIRM_KEY = 'skip-logout-confirmation'

export function shouldSkipLogoutConfirm(): boolean {
  return localStorage.getItem(SKIP_LOGOUT_CONFIRM_KEY) === 'true'
}

interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function LogoutConfirmDialog({ open, onOpenChange, onConfirm }: LogoutConfirmDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const handleConfirm = () => {
    if (dontAskAgain) localStorage.setItem(SKIP_LOGOUT_CONFIRM_KEY, 'true')
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('logout-confirm-title')}</DialogTitle>
          <DialogDescription className="pt-1">{t('logout-confirm-message')}</DialogDescription>
        </DialogHeader>

        {/* Checkbox na MESMA linha dos botões: label à esquerda, ações à direita. */}
        <DialogFooter className="flex-row items-center sm:justify-between">
          <label className="flex min-w-0 items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <span className="truncate">{t('logout-confirm-dont-ask')}</span>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              <LogOutIcon size={14} />
              {t('logout')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { ReactNode } from 'react'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'

import { cn } from '@/lib/tailwind/utils'

/**
 * Botão padrão das page actions (header do Pages): float card com botão
 * ghost. Suporta modo só-ícone (card quadrado, com tooltip via `title`) e
 * estado ativo para toggles (botão preenchido).
 */
export function PageActionButton({
  icon,
  children,
  onClick,
  disabled = false,
  iconOnly = false,
  active = false,
  title,
  className,
  buttonClassName,
}: {
  icon?: ReactNode
  /** Label do botão (omitido no modo iconOnly). */
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** Só o ícone, num card quadrado (sem label) — use `title` para tooltip. */
  iconOnly?: boolean
  /** Estado ativo (toggle): botão preenchido (variant default). */
  active?: boolean
  title?: string
  /** Classes extras do float card (ex.: bg-primary! para destaque). */
  className?: string
  /** Classes extras do botão (ex.: text-white em cards primary). */
  buttonClassName?: string
}) {
  return (
    <FloatCard
      className={cn(
        iconOnly ? 'flex size-9 items-center justify-center' : 'flex h-9 items-center',
        className
      )}
    >
      <Button
        variant={active ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'h-full rounded-xl',
          iconOnly && 'w-full',
          active && 'text-white',
          buttonClassName
        )}
        onClick={onClick}
        disabled={disabled}
        title={title}
      >
        {icon}
        {!iconOnly && children}
      </Button>
    </FloatCard>
  )
}

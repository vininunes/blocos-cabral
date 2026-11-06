import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/tailwind/utils'

const badgeVariantConfig = {
  variants: {
    variant: {
      // Variantes de fundo forte (primary/positive/destructive): texto E ícone
      // sempre brancos — o [&>svg]:text-white vence classe de cor posta no
      // próprio ícone pelo caller. Badge com paleta própria (ex.: severidade)
      // deve partir de 'secondary'/'outline', não daqui.
      default:
        'border-transparent bg-primary text-white [&>svg]:text-white [a&]:hover:bg-primary/90',
      secondary: 'border-transparent bg-secondary text-neutral [a&]:hover:bg-secondary/90',
      destructive:
        'border-transparent bg-destructive text-white [&>svg]:text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive',
      positive:
        'border-transparent bg-positive text-white [&>svg]:text-white [a&]:hover:bg-positive/90 focus-visible:ring-positive/20',
      outline: 'text-neutral [a&]:hover:bg-accent [a&]:hover:text-neutral',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
} as const

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border shadow-xs px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow]',
  badgeVariantConfig
)

function BadgeBase({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { BadgeBase, badgeVariants }
export type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

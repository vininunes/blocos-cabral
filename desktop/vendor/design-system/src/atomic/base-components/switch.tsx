import * as React from 'react'

import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/tailwind/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'cursor-pointer peer data-[state=checked]:bg-positive data-[state=unchecked]:bg-destructive focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-destructive inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Branco SÓLIDO em todos os temas, de propósito: o trilho é sempre uma
          // cor forte (positive/destructive), então o branco contrasta nos
          // dois estados — com `bg-foreground`, no solid-theme claro o thumb
          // ficava escuro e sumia sobre o vermelho.
          'pointer-events-none block size-3.5 rounded-md bg-white ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%)] data-[state=unchecked]:translate-x-[calc(12%)]'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

import * as React from 'react'

import { cn } from '@/lib/tailwind/utils'

const InputBase = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        {...props}
        ref={ref}
        type={type}
        className={cn(
          'file:text-neutral placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground  border-input flex h-7 w-full min-w-0 rounded-md border bg-input pr-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
      />
    )
  }
)

InputBase.displayName = 'InputBase'

export { InputBase }

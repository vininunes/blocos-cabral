import React from 'react'

import { cn } from '@/lib/tailwind/utils.ts'

import { FormItemContext } from '../context'

/**
 * Form item wrapper component that provides context for form fields
 * Automatically generates unique IDs for accessibility
 *
 * @example
 * ```tsx
 * <FormItem>
 *   <FormLabel>Name</FormLabel>
 *   <FormControl>
 *     <Input />
 *   </FormControl>
 *   <FormMessage />
 * </FormItem>
 * ```
 */
export function FormItem({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('flex-1', className)} {...props} />
    </FormItemContext.Provider>
  )
}

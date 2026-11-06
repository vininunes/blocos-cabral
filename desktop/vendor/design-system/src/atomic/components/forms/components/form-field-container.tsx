import React from 'react'

import { cn } from '@/lib/tailwind/utils'

/**
 * Container component for form fields that provides consistent layout
 * Supports horizontal (label-input side by side) and vertical (stacked) layouts
 *
 * @example
 * ```tsx
 * <FormFieldContainer label={<FormLabel>Name</FormLabel>}>
 *   <Input />
 * </FormFieldContainer>
 * ```
 */
export interface FormFieldContainerProps {
  label?: React.ReactNode
  children: React.ReactNode
  layout?: 'horizontal' | 'vertical'
  className?: string
}

export function FormFieldContainer({
  label,
  children,
  layout = 'horizontal',
  className,
}: FormFieldContainerProps) {
  if (layout === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-2 w-full min-h-11 p-2', className)}>
        {label}
        {children}
      </div>
    )
  }

  return (
    <div className={cn('flex justify-between w-full gap-1 items-center p-2 min-h-11', className)}>
      {label}
      {children}
    </div>
  )
}

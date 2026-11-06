import React from 'react'

import { Slot } from '@radix-ui/react-slot'

import { useFormField } from '../hooks/use-form-field'

/**
 * Form control wrapper that provides accessibility attributes
 * Uses Radix UI Slot to merge props with child element
 *
 * @example
 * ```tsx
 * <FormControl>
 *   <Input />
 * </FormControl>
 * ```
 */
export function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

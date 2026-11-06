import { Label } from '@/atomic/base-components/label'

import { cn } from '@/lib/tailwind/utils'

import { useFormField } from '../hooks/use-form-field'

/**
 * Form label component that automatically shows error state
 * Changes color to destructive when field has validation errors
 *
 * @example
 * ```tsx
 * <FormLabel>Email Address</FormLabel>
 * ```
 */
export function FormLabel(props: React.ComponentProps<typeof Label>) {
  const field = useFormField()
  const hasError = field.error !== null && field.error !== undefined
  return <Label {...props} className={cn(hasError && 'text-destructive', props.className)} />
}

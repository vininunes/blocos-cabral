import React from 'react'

import {
  Controller,
  useFormContext,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
  type UseFormStateReturn,
} from 'react-hook-form'

import { FormFieldContext } from '../context'

/**
 * Form field wrapper using react-hook-form Controller
 * Provides render props pattern for custom field implementations
 *
 * @example
 * ```tsx
 * <FormField
 *   name="email"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Email</FormLabel>
 *       <FormControl>
 *         <Input {...field} />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 * ```
 */
export interface FormFieldProps {
  /** Field name for form registration */
  name: string
  /** Render function that receives field props */
  render: (props: {
    field: ControllerRenderProps<FieldValues, string>
    fieldState: ControllerFieldState
    formState: UseFormStateReturn<FieldValues>
  }) => React.ReactElement
}

export function FormField({ name, render }: FormFieldProps) {
  const { control } = useFormContext()

  return (
    <FormFieldContext.Provider value={{ name }}>
      <Controller name={name} control={control} render={render} />
    </FormFieldContext.Provider>
  )
}

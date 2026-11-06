import React, { useMemo } from 'react'

import {
  FormProvider,
  FormProviderProps,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'

import { InputFormNumber } from '@/atomic/components/forms/fields/input-form-number'
import { InputFormText } from '@/atomic/components/forms/fields/input-form-text'

import { FormFocusContext, FormFocusContextType } from '../context'
import { FormControl } from './form-control'
import { FormField } from './form-field'
import { FormItem } from './form-item'
import { FormLabel } from './form-label'
import { FormMessage } from './form-message'

export type FormProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
  TTransformedValues extends FieldValues = TFieldValues,
> = React.PropsWithChildren &
  FormProviderProps<TFieldValues, TContext, TTransformedValues> & {
    setFieldFocused?: (isFocused: boolean) => void
  }

/**
 * Form component that wraps react-hook-form FormProvider
 * Must receive form methods via spread operator
 *
 * @example
 * ```tsx
 * const methods = useForm<FormData>()
 *
 * <Form {...methods}>
 *   <form onSubmit={methods.handleSubmit(onSubmit)}>
 *     <InputFormText name="email" label="Email" />
 *   </form>
 * </Form>
 * ```
 */
function Form<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
  TTransformedValues extends FieldValues = TFieldValues,
>({
  children,
  setFieldFocused,
  ...methods
}: FormProps<TFieldValues, TContext, TTransformedValues> &
  UseFormReturn<TFieldValues, TContext, TTransformedValues>): React.JSX.Element {
  const value = useMemo<FormFocusContextType>(
    () => ({
      setFieldFocused: (isFocused) => {
        setFieldFocused?.(isFocused)
      },
    }),
    [setFieldFocused]
  )

  return (
    <FormFocusContext.Provider value={value}>
      <FormProvider {...methods}>{children}</FormProvider>
    </FormFocusContext.Provider>
  )
}

export {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  InputFormNumber,
  InputFormText,
}

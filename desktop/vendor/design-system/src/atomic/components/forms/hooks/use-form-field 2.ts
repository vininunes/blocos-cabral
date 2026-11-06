import React from 'react'

import { useFormContext, useFormState } from 'react-hook-form'

import { FormFieldContext, FormItemContext } from '../context'

interface UseFormFieldReturn {
  id: string
  name: string
  formItemId: string
  formDescriptionId: string
  formMessageId: string
  error?: Record<string, unknown> | null
  invalid?: boolean
  isTouched?: boolean
  isDirty?: boolean
}

export const useFormField = (): UseFormFieldReturn => {
  const { name } = React.useContext(FormFieldContext)
  const { id } = React.useContext(FormItemContext)
  const { control } = useFormContext()

  // useFormState creates a per-component subscription so FormMessage
  // re-renders when the named field's state changes (including errors after submit)
  const { errors, touchedFields, dirtyFields } = useFormState({ control, name })

  const error = (errors as Record<string, unknown>)[name] as
    | Record<string, unknown>
    | undefined

  return {
    id,
    name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    error: error ?? null,
    invalid: !!error,
    isTouched: !!(touchedFields as Record<string, unknown>)[name],
    isDirty: !!(dirtyFields as Record<string, unknown>)[name],
  }
}

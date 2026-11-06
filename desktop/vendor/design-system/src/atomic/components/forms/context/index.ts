import React from 'react'

import { FieldPath, FieldValues } from 'react-hook-form'

export interface FormItemContextValue {
  id: string
}

export interface FormFocusContextType {
  setFieldFocused: (isFocused: boolean) => void
}

export interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
}

export const FormFieldContext = React.createContext<FormFieldContextValue>({
  name: '',
})
export const FormItemContext = React.createContext<FormItemContextValue>({ id: '' })

export const FormFocusContext = React.createContext<FormFocusContextType | undefined>(undefined)

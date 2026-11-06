import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/tailwind/utils.ts'

import { useFormField } from '../hooks/use-form-field'

export interface FormMessageProps extends React.ComponentProps<'p'> {
  className?: string
}

export function FormMessage({ className, ...props }: FormMessageProps) {
  const { error, formMessageId } = useFormField()
  const { t } = useTranslation()

  const messageError = String(error?.message ?? '')
  const translatedMessage = messageError ? t(messageError) : null

  const errorMessage = translatedMessage ? translatedMessage : messageError

  if (errorMessage == null) {
    return null
  }

  return (
    <p
      id={formMessageId}
      className={cn(errorMessage && 'text-destructive flex text-sm', className)}
      {...props}
    >
      {errorMessage}
    </p>
  )
}

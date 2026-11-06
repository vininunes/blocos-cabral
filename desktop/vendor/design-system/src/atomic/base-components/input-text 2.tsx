import * as React from 'react'

import { cn } from '@/lib/tailwind/utils'

import { InputBase } from './input-base'

const InputText = React.forwardRef<
  HTMLInputElement,
  {
    icon?: React.ReactNode
    /** 'float': para uso dentro de FloatCards (page actions) — ocupa toda a
     *  altura do card, fundo branco com opacidade 5 e cantos do card. */
    variant?: 'default' | 'float'
  } & React.ComponentProps<'input'>
>(({ className, icon, variant = 'default', ...props }, ref) => {
  const float = variant === 'float'

  return (
    <div className={cn('h-7 relative rounded-md', float && 'h-full rounded-xl', className)}>
      {icon && (
        <div
          className={cn(
            // w-9 = pr-9 do input: ícone centralizado no espaço reservado
            'absolute top-1/2 right-0 transform -translate-y-1/2 h-7 w-9 flex justify-center items-center bg-muted rounded-r-md cursor-text pointer-events-none',
            // Box do ícone na variante float: altura total × largura do
            // padding reservado, com fundo branco translúcido
            float && 'h-full w-9 bg-white/5 rounded-r-xl'
          )}
        >
          {icon}
        </div>
      )}

      <InputBase
        ref={ref}
        type={'text'}
        className={cn(
          'pl-2',
          icon && 'pr-9',
          float && 'h-full rounded-xl bg-white/5 border-transparent shadow-none',
          className
        )}
        {...props}
      />
    </div>
  )
})

InputText.displayName = 'InputText'

export { InputText }

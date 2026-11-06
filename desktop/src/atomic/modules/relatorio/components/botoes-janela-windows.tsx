import { useEffect, useState } from 'react'

import { cn } from '@/lib/tailwind/utils'

/**
 * Minimizar / maximizar (restaurar) / fechar no Windows e no Linux, desenhados pelo header no
 * lugar do overlay nativo: o hover nativo some sobre o header branco e o overlay fica por cima
 * do fundo escurecido dos dialogs. Medidas e cores seguem a barra de título do Windows 11:
 * botões de 46 px, hover cinza, fechar vermelho com ícone branco. Ícones de 10 px com
 * `size-2.5`: sem uma classe `size-*`, o global.css do design system força todo svg a 16 px.
 */
export function BotoesJanelaWindows() {
  const janela = window.relatorioDesktop?.janela
  const [maximizada, setMaximizada] = useState(false)

  useEffect(() => {
    if (!janela) return
    void janela.estaMaximizada().then(setMaximizada)
    return janela.aoMudarMaximizada(setMaximizada)
  }, [janela])

  if (!janela) return null

  const base =
    'desktop-no-drag flex h-full w-[46px] items-center justify-center text-foreground transition-colors duration-100 outline-none'

  return (
    // h = altura do header sem a borda de baixo (h-14 = 56 px, borda de 1 px)
    <div className="absolute top-0 right-0 flex h-[55px]" role="group" aria-label="Janela">
      <button
        type="button"
        className={cn(base, 'hover:bg-black/[0.06] active:bg-black/[0.1]')}
        onClick={janela.minimizar}
        aria-label="Minimizar"
        title="Minimizar"
      >
        <svg className="size-2.5" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        type="button"
        className={cn(base, 'hover:bg-black/[0.06] active:bg-black/[0.1]')}
        onClick={janela.maximizar}
        aria-label={maximizada ? 'Restaurar' : 'Maximizar'}
        title={maximizada ? 'Restaurar' : 'Maximizar'}
      >
        {maximizada ? (
          <svg
            className="size-2.5"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
          >
            <path d="M2.5 2.5V.5h7v7h-2" stroke="currentColor" strokeWidth="1" />
            <rect x=".5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
          </svg>
        ) : (
          <svg
            className="size-2.5"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
          >
            <rect x=".5" y=".5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={cn(
          base,
          'hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90 active:text-white'
        )}
        onClick={janela.fechar}
        aria-label="Fechar"
        title="Fechar"
      >
        <svg className="size-2.5" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  )
}

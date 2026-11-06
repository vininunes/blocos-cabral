import type { ReactNode } from 'react'

import cabralSymbol from '@/images/cabral-symbol.svg'
import { useTranslation } from 'react-i18next'

import { FloatCard } from '@/atomic/base-components/float-card'

import { DESKTOP_PLATFORM, DESKTOP_TITLEBAR_INSET, MAC_BOTOES_JANELA } from '@/config/desktop'

import { cn } from '@/lib/tailwind/utils'

import { useJanelaEmFoco } from '../hooks/use-janela-em-foco'
import { BotoesJanelaWindows } from './botoes-janela-windows'

/**
 * macOS, janela sem foco: o main esconde os botões nativos (quase brancos sobre o header) e
 * aqui ficam três círculos cinza no mesmo lugar. O 1º clique na janela devolve o foco e os nativos.
 */
function BotoesJanelaInativa() {
  const { esquerda, topo, diametro, passo } = MAC_BOTOES_JANELA
  return (
    <div className="pointer-events-none absolute" style={{ left: esquerda, top: topo }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border border-black/10 bg-[#c8c8cc] dark:bg-[#5a5a5f]"
          style={{ left: i * passo, width: diametro, height: diametro }}
        />
      ))}
    </div>
  )
}

/**
 * Header: ações à esquerda · marca + selo
 * centralizados · ações à direita. No app instalado é a continuação da barra de
 * título: os botões da janela ficam sobre ele e arrastar move a janela.
 */
export function RelatorioHeader({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  const { t } = useTranslation()
  const emFoco = useJanelaEmFoco()
  return (
    <div
      className={cn(
        'relative bg-background border-b border-border h-14 flex items-center gap-2 py-3 px-4 shrink-0',
        DESKTOP_PLATFORM && 'desktop-drag-region select-none'
      )}
      style={{
        paddingLeft: 16 + DESKTOP_TITLEBAR_INSET.left,
        paddingRight: 16 + DESKTOP_TITLEBAR_INSET.right,
      }}
    >
      {DESKTOP_PLATFORM === 'darwin' && !emFoco && <BotoesJanelaInativa />}
      {DESKTOP_PLATFORM && DESKTOP_PLATFORM !== 'darwin' && <BotoesJanelaWindows />}
      <div className="flex-1 flex gap-2 items-center min-w-0">{left}</div>

      <div className="flex gap-3 items-center shrink-0 justify-center">
        <img className="h-7 shrink-0" src={cabralSymbol} alt="" />
        <span className="hidden md:block text-base font-bold tracking-tight text-foreground">
          Blocos Cabral
        </span>
        <FloatCard className="flex h-7 items-center rounded-full bg-primary px-3 text-xs text-primary-foreground whitespace-nowrap shrink-0">
          {t('relatorio.titulo')}
        </FloatCard>
      </div>

      <div className="flex-1 flex gap-2 items-center justify-end min-w-0">{right}</div>
    </div>
  )
}

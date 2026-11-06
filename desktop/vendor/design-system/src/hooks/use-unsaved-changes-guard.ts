import { useCallback, useEffect, useRef, useState } from 'react'

import { useBlocker } from 'react-router-dom'

/** Estado de um diálogo de "descartar alterações?" (ver UnsavedChangesDialog). */
export interface UnsavedChangesPrompt {
  open: boolean
  /** Descartar e seguir com a ação/navegação interrompida. */
  confirm: () => void
  /** Ficar (fecha o diálogo; nada acontece). Chamar depois do confirm é inócuo. */
  cancel: () => void
}

/**
 * Proteção de SAÍDA de uma sessão de edição com alterações não salvas:
 * - navegação dentro do app (troca de rota — mudanças só de query string,
 *   como o viewport do mapa, passam direto) fica BLOQUEADA até o usuário
 *   decidir no diálogo;
 * - recarregar/fechar a aba cai no aviso nativo do navegador (`beforeunload`).
 *
 * `onDiscard` roda antes de seguir a navegação (ex.: largar um rascunho que
 * ficaria em memória num atom global). Só um guard destes pode estar montado
 * por vez (limite do `useBlocker` do react-router).
 */
export function useUnsavedChangesLeaveGuard(
  dirty: boolean,
  { onDiscard, onStay }: { onDiscard?: () => void; onStay?: () => void } = {}
): UnsavedChangesPrompt {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // navegadores legados só mostram o aviso com returnValue preenchido
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Salvou/reverteu com o diálogo aberto: nada mais a perder, libera o bloqueio.
  useEffect(() => {
    if (!dirty && blocker.state === 'blocked') blocker.reset()
  }, [dirty, blocker])

  // O ConfirmationDialog chama onOpenChange(false) logo depois do onConfirm:
  // a primeira resposta vale, a segunda é ignorada.
  const settledRef = useRef(false)
  useEffect(() => {
    if (blocker.state === 'blocked') settledRef.current = false
  }, [blocker.state])

  const handlersRef = useRef({ onDiscard, onStay })
  handlersRef.current = { onDiscard, onStay }

  const confirm = useCallback(() => {
    if (settledRef.current || blocker.state !== 'blocked') return
    settledRef.current = true
    handlersRef.current.onDiscard?.()
    blocker.proceed()
  }, [blocker])

  const cancel = useCallback(() => {
    if (settledRef.current || blocker.state !== 'blocked') return
    settledRef.current = true
    handlersRef.current.onStay?.()
    blocker.reset()
  }, [blocker])

  return { open: blocker.state === 'blocked', confirm, cancel }
}

/**
 * Confirmação de DESCARTE para ações dentro da página que jogariam fora uma
 * edição em curso (trocar de painel, de recorte, fechar a bandeja...).
 * `guard(action)` executa na hora quando não há alterações; senão abre o
 * diálogo e só executa se o usuário confirmar.
 */
export function useUnsavedChangesConfirm(dirty: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const guard = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action()
      return
    }
    setPending(() => action)
  }, [])

  const prompt: UnsavedChangesPrompt = {
    open: pending !== null,
    confirm: () => {
      setPending(null)
      pending?.()
    },
    cancel: () => setPending(null),
  }

  return { guard, prompt }
}

/** O alvo do evento é um campo editável (input/textarea/contentEditable como
 * o CodeMirror)? Atalhos globais do módulo se calam nesses alvos. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

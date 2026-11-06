import { useCallback } from 'react'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { APPLICATION_VERSION } from '@/config/env'

// Atoms persistidos em localStorage. Por serem atoms, o indicador no header e a
// janela de novidades da welcome page compartilham o mesmo estado e se atualizam
// juntos (ao marcar como visto, o ponto azul some na mesma hora).
// `getOnInit: true` le o localStorage de forma sincrona, evitando "flash" na
// primeira renderizacao.

/** Ultima versao do changelog vista naquele navegador. */
const lastSeenVersionAtom = atomWithStorage<string | null>(
  't2s:last-seen-changelog-version',
  null,
  undefined,
  { getOnInit: true }
)

/** Preferencia do usuario para nao exibir a janela de novidades na welcome page. */
const hideChangelogModalAtom = atomWithStorage<boolean>(
  't2s:hide-changelog-modal',
  false,
  undefined,
  { getOnInit: true }
)

/**
 * Controla o indicador de "novidade" do changelog e a janela de novidades.
 *
 * Compara a versão atual do app (APPLICATION_VERSION, vinda do package.json)
 * com a última versão vista naquele navegador. Quando diferem, `hasNewVersion`
 * é `true` (indicador aparece e a janela pode ser exibida). `markSeen()` grava a
 * versão atual e some com o indicador.
 *
 * `hideModal` guarda a preferência do usuário de não exibir a janela na welcome
 * page — nesse caso ele continua vendo apenas o ícone azul no botão do changelog.
 */
export function useChangelogSeen() {
  const lastSeenVersion = useAtomValue(lastSeenVersionAtom)
  const setLastSeenVersion = useSetAtom(lastSeenVersionAtom)
  const [hideModal, setHideModal] = useAtom(hideChangelogModalAtom)

  const hasNewVersion = lastSeenVersion !== APPLICATION_VERSION

  const markSeen = useCallback(() => {
    setLastSeenVersion(APPLICATION_VERSION)
  }, [setLastSeenVersion])

  return { hasNewVersion, markSeen, hideModal, setHideModal, lastSeenVersion }
}

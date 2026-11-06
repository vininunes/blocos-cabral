import { atom } from 'jotai'

/**
 * Modo de exibição do `LastUpdate` com o player ativo:
 * - false: RELATIVO à agulha do player ("há 2 minutos").
 * - true: ABSOLUTO — a hora real da posição, com o rótulo do fuso (LT/UTC).
 * Global: alternar num card vale para todos os indicadores em cena.
 */
export const lastUpdateAbsoluteAtom = atom(false)

import { useTime } from './use-time'

/**
 * Relógio de 1 s para rótulos de "há N s" que precisam envelhecer sem que o
 * dado mude.
 *
 * Delegado ao relógio compartilhado (`nowAtom`, um único setInterval via
 * onMount): antes cada instância (4 widgets PPU + uma por linha da frota)
 * criava o próprio setInterval com setState próprio.
 */
export function useNow(): number {
  return useTime({ live: true }).nowMs
}

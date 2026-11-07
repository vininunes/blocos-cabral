import type { Celula, Tabela } from '@server/relatorio/api-tipos'
import { norm } from '@server/relatorio/utils'

/** A célula contém o termo (já normalizado)? Texto e números inteiros (pedido, nota, proposta). */
export const celulaContem = (v: Celula, termo: string) =>
  (typeof v === 'string' && norm(v).includes(termo)) ||
  (typeof v === 'number' && Number.isInteger(v) && String(v).includes(termo))

/** Linhas da tabela que contêm o termo em alguma célula (sem termo, a tabela inteira). */
export function filtrarTabela(t: Tabela, busca: string): Tabela {
  const termo = norm(busca)
  if (!termo) return t
  return { ...t, linhas: t.linhas.filter((l) => l.some((v) => celulaContem(v, termo))) }
}

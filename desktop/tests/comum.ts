import fs from 'node:fs'
import path from 'node:path'

import { Base } from '../server/relatorio/base'

export const ENTRADA = path.resolve(__dirname, '../../entrada')
export const ARQS = [
  'vendas_2026-10-17-14-39-51.csv',
  'orcamentos_2026-10-17-14-33-27.csv',
  'notas_2026-10-17-16-41-00.pdf',
]

export const arquivos = (nomes = ARQS) =>
  nomes.map((nome) => ({
    nome,
    conteudo: new Uint8Array(fs.readFileSync(path.join(ENTRADA, nome))),
  }))

export async function baseCom(nomes = ARQS) {
  const b = new Base()
  const r = await b.importar(arquivos(nomes))
  return { b, r }
}

/** Igualdade profunda com tolerância numérica (somas em ordem diferente do pandas). */
export function diferencas(a: unknown, b: unknown, onde = '$', out: string[] = []): string[] {
  if (out.length > 20) return out
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)))
      out.push(`${onde}: ${a} != ${b}`)
    return out
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${onde}: tamanho ${a.length} != ${b.length}`)
    for (let i = 0; i < Math.min(a.length, b.length); i++)
      diferencas(a[i], b[i], `${onde}[${i}]`, out)
    return out
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      diferencas(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        `${onde}.${k}`,
        out
      )
    return out
  }
  if (a !== b && !(a == null && b == null))
    out.push(`${onde}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)
  return out
}

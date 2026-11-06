/**
 * Dias úteis: segunda a sexta, sem os feriados nacionais (fixos + Sexta-feira Santa).
 * Carnaval e Corpus Christi são ponto facultativo e contam como dia útil.
 */
import { addDias, ano, diaSemana, intervalo, type Dia } from './datas'

const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(y: number): Dia {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31),
    dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const cache = new Map<number, Set<Dia>>()

/** Feriados nacionais do ano. */
export function feriados(y: number): Set<Dia> {
  let f = cache.get(y)
  if (!f) {
    f = new Set([...FIXOS.map((md) => `${y}-${md}`), addDias(pascoa(y), -2)]) // Sexta-feira Santa
    cache.set(y, f)
  }
  return f
}

export const diaUtil = (d: Dia) => diaSemana(d) < 5 && !feriados(ano(d)).has(d)

/** Dias úteis de `ini` a `fim` (inclusive). */
export const diasUteis = (ini: Dia, fim: Dia) => intervalo(ini, fim).filter(diaUtil)

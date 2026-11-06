/**
 * Períodos do relatório: Dia, Semana (seg-dom), Mês, Trimestre, Semestre, Ano e Personalizado,
 * e o período de comparação (anterior, até a mesma data, ano anterior ou personalizado).
 */
import {
  addDias,
  addMeses,
  ano,
  diaDoMes,
  diaSemana,
  difDias,
  formatar,
  mes,
  ultimoDiaDoMes,
  type Dia,
} from './datas'
import { DIAS, fmtData, MESES } from './utils'

export const TIPOS = [
  'Dia',
  'Semana',
  'Mês',
  'Trimestre',
  'Semestre',
  'Ano',
  'Personalizado',
] as const
export type TipoPeriodo = (typeof TIPOS)[number]
export const MENSAIS: Partial<Record<TipoPeriodo, number>> = {
  Mês: 1,
  Trimestre: 3,
  Semestre: 6,
  Ano: 12,
}

export const ANTERIOR = 'Período anterior'
export const MESMA_DATA = 'Até a mesma data'
export const ANO_ANTERIOR = 'Mesmo período do ano anterior'
export const PERSONALIZADO = 'Personalizado'
export const SEM_COMPARACAO = 'Sem comparação'
export const MODOS = [MESMA_DATA, ANTERIOR, ANO_ANTERIOR, PERSONALIZADO, SEM_COMPARACAO] as const
export type ModoComparacao = (typeof MODOS)[number]

/** Mesmo dia `meses` adiante (ou atrás); se o mês não tiver o dia, usa o último dia do mês. */
export function moverData(d: Dia, meses: number): Dia {
  const ini = addMeses(d, meses)
  const ultimo = ultimoDiaDoMes(ano(ini), mes(ini))
  return `${ini.slice(0, 8)}${String(Math.min(diaDoMes(d), ultimo)).padStart(2, '0')}`
}

export class Periodo {
  constructor(
    readonly tipo: TipoPeriodo,
    readonly inicio: Dia,
    readonly fim: Dia,
    /** cortado antes do fim natural (ex.: mês até o último dia com dados) */
    readonly parcial = false
  ) {}

  static de(tipo: TipoPeriodo, ancora: Dia, de?: Dia | null, ate?: Dia | null): Periodo {
    const a = ancora
    if (tipo === 'Dia') return new Periodo(tipo, a, a)
    if (tipo === 'Semana') {
      const ini = addDias(a, -diaSemana(a))
      return new Periodo(tipo, ini, addDias(ini, 6))
    }
    const meses = MENSAIS[tipo]
    if (meses) {
      const m0 = Math.floor((mes(a) - 1) / meses) * meses
      const ini = `${a.slice(0, 4)}-${String(m0 + 1).padStart(2, '0')}-01`
      return new Periodo(tipo, ini, addDias(addMeses(ini, meses), -1))
    }
    const d1 = de || a
    const d2 = ate || de || a
    return new Periodo('Personalizado', d1 <= d2 ? d1 : d2, d1 <= d2 ? d2 : d1)
  }

  get dias() {
    return difDias(this.fim, this.inicio) + 1
  }

  anterior() {
    return this.deslocar(-1)
  }

  deslocar(n: number): Periodo {
    const meses = MENSAIS[this.tipo]
    if (meses) return Periodo.de(this.tipo, addMeses(this.inicio, n * meses))
    const d = this.dias * n
    return new Periodo(this.tipo, addDias(this.inicio, d), addDias(this.fim, d))
  }

  /** Período até `ate` (inclusive), quando `ate` cai antes do fim. */
  cortar(ate: Dia): Periodo {
    if (this.inicio <= ate && ate < this.fim) return new Periodo(this.tipo, this.inicio, ate, true)
    return this
  }

  igual(o: Periodo | null | undefined) {
    return (
      !!o &&
      o.tipo === this.tipo &&
      o.inicio === this.inicio &&
      o.fim === this.fim &&
      o.parcial === this.parcial
    )
  }

  get rotulo(): string {
    const i = this.inicio,
      f = this.fim
    const ate = this.parcial ? ` (até ${fmtData(f, false)})` : ''
    switch (this.tipo) {
      case 'Dia':
        return `${DIAS[diaSemana(i)]}, ${fmtData(i)}`
      case 'Semana':
        return `Semana ${fmtData(i, false)} a ${fmtData(f)}${this.parcial ? ' (parcial)' : ''}`
      case 'Mês':
        return `${MESES[mes(i) - 1]} de ${ano(i)}${ate}`
      case 'Trimestre':
        return `${Math.floor((mes(i) - 1) / 3) + 1}º trimestre de ${ano(i)}${ate}`
      case 'Semestre':
        return `${mes(i) <= 6 ? 1 : 2}º semestre de ${ano(i)}${ate}`
      case 'Ano':
        return `Ano ${ano(i)}${ate}`
      default:
        return `${fmtData(i)} a ${fmtData(f)}`
    }
  }

  /** Rótulo curto para colunas, legendas e cartões (ex.: 'Out/26', 'Out/26 até 16/10'). */
  get curto(): string {
    const i = this.inicio,
      f = this.fim
    if (this.tipo === 'Dia') return formatar(i, '%d/%m/%y')
    if (this.tipo === 'Semana') {
      if (this.parcial)
        return mes(i) === mes(f)
          ? `Sem ${formatar(i, '%d')}–${formatar(f, '%d/%m/%y')}`
          : `Sem ${formatar(i, '%d/%m')}–${formatar(f, '%d/%m/%y')}`
      return `Sem ${formatar(i, '%d/%m/%y')}`
    }
    if (this.tipo === 'Personalizado') return `${formatar(i, '%d/%m')}–${formatar(f, '%d/%m/%y')}`
    const txt = {
      Mês: `${MESES[mes(i) - 1].slice(0, 3)}/${formatar(i, '%y')}`,
      Trimestre: `${Math.floor((mes(i) - 1) / 3) + 1}º tri/${formatar(i, '%y')}`,
      Semestre: `${mes(i) <= 6 ? 1 : 2}º sem/${formatar(i, '%y')}`,
      Ano: `${ano(i)}`,
    }[this.tipo]
    return txt + (this.parcial ? ` até ${formatar(f, '%d/%m')}` : '')
  }

  /** Agrupamento dos gráficos de evolução. */
  granularidade(): 'dia' | 'semana' | 'mês' {
    if (this.dias <= 31) return 'dia'
    if (this.dias <= 92) return 'semana'
    return 'mês'
  }

  toJSON() {
    return {
      tipo: this.tipo,
      inicio: this.inicio,
      fim: this.fim,
      parcial: this.parcial,
      rotulo: this.rotulo,
      curto: this.curto,
    }
  }
}

/**
 * [A, B]: período analisado e período de comparação.
 *
 * Período anterior: A inteiro x período anterior inteiro.
 * Até a mesma data: A vai até o último dia com dados; B é o período anterior até o mesmo ponto
 *   (mesmo dia do mês nos períodos mensais; mesma quantidade de dias nos demais).
 * Ano anterior: mesmo corte, um ano antes (Dia e Semana voltam 52 semanas para manter o dia da semana).
 * Personalizado: A inteiro x B livre (de/ate).
 * Sem comparação: A inteiro e B = null.
 */
export function comparacao(
  p: Periodo,
  modo: ModoComparacao,
  ultimoDia: Dia,
  de?: Dia | null,
  ate?: Dia | null
): [Periodo, Periodo | null] {
  if (modo === SEM_COMPARACAO) return [p, null]
  if (modo === PERSONALIZADO) {
    const d1 = de || p.inicio
    const d2 = ate || de || p.fim
    return [p, new Periodo('Personalizado', d1 <= d2 ? d1 : d2, d1 <= d2 ? d2 : d1)]
  }
  if (modo === ANTERIOR) return [p, p.anterior()]
  const a = p.cortar(ultimoDia)
  const meses = MENSAIS[p.tipo]
  if (modo === ANO_ANTERIOR) {
    if (p.tipo === 'Dia' || p.tipo === 'Semana')
      return [a, new Periodo(p.tipo, addDias(a.inicio, -364), addDias(a.fim, -364), a.parcial)]
    if (!a.parcial && meses) return [a, Periodo.de(p.tipo, moverData(p.inicio, -12))]
    return [a, new Periodo(p.tipo, moverData(a.inicio, -12), moverData(a.fim, -12), a.parcial)]
  }
  // até a mesma data
  const b = p.anterior()
  if (!a.parcial) return [a, b]
  const fim = meses ? moverData(a.fim, -meses) : addDias(b.inicio, difDias(a.fim, a.inicio))
  return [a, new Periodo(b.tipo, b.inicio, fim <= b.fim ? fim : b.fim, true)]
}

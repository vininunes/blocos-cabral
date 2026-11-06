/** Textos dos cartões (port de fmt_kpi / fmt_curto / fmt_delta do painel). */
import type { FormatoKpi, KpiJson, RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct, fmtSinal } from '@server/relatorio/utils'

export function fmtKpi(v: number | null, f: FormatoKpi) {
  if (v === null) return '-'
  if (f === 'moeda') return fmtMoeda(v)
  if (f === 'pct') return fmtPct(v)
  if (f === 'dias') return fmtNum(v, 1)
  return fmtNum(v)
}

/** Valor resumido para as barras dos cartões. */
export const fmtCurto = (v: number | null, f: FormatoKpi) =>
  f === 'moeda' && v !== null ? fmtMoedaCurta(v) : fmtKpi(v, f)

export type Delta = {
  seta: string
  principal: string
  detalhe?: string
  tom: 'pos' | 'neg' | 'neu'
}

/** '▲ +9,6% · +R$ 50,6 mil', verde/vermelho conforme subir ser bom ou ruim. null = não mostrar. */
export function fmtDelta(k: KpiJson, rel: RespostaRelatorio): Delta | null {
  if (!rel.compara) return null
  const d = k.delta
  if (rel.coberturaB === 'nenhuma')
    return { seta: '', principal: 'sem dados para comparar', tom: 'neu' }
  if (d === null || (k.formato !== 'pct' && !k.anterior && !k.atual))
    return { seta: '', principal: 'sem movimento', tom: 'neu' }
  const seta = d > 0 ? '▲' : d < 0 ? '▼' : '■'
  const tom = k.melhorou === true ? 'pos' : k.melhorou === false ? 'neg' : 'neu'
  if (k.formato === 'pct')
    return { seta, principal: `${fmtSinal(d * 100, (x) => fmtNum(x, 1))} p.p.`, tom }
  const abs = fmtSinal(
    d,
    k.formato === 'moeda'
      ? fmtMoedaCurta
      : k.formato === 'dias'
        ? (x) => fmtNum(x, 1)
        : (x) => fmtNum(x)
  )
  return k.variacao !== null
    ? { seta, principal: fmtPct(k.variacao, 1, true), detalhe: abs, tom }
    : { seta, principal: abs, detalhe: `sem base em ${rel.nomeB}`, tom }
}

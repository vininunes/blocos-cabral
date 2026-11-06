import type {
  ConsultaRelatorio,
  DiaIso,
  Filtro,
  ModoComparacao,
  TipoPeriodo,
} from '@server/relatorio/api-tipos'
import { atom } from 'jotai'

/** Filtros do relatório (o que o painel guardava no session_state). */
export type RelatorioFiltros = {
  tipo: TipoPeriodo
  /** null até a base carregar (vira a data mais recente com dados). */
  ancora: DiaIso | null
  de: DiaIso | null
  ate: DiaIso | null
  modo: ModoComparacao
  cmpDe: DiaIso | null
  cmpAte: DiaIso | null
  filtro: Filtro
}

export const relatorioFiltrosAtom = atom<RelatorioFiltros>({
  tipo: 'Semana',
  ancora: null,
  de: null,
  ate: null,
  modo: 'Até a mesma data',
  cmpDe: null,
  cmpAte: null,
  filtro: 'Todos',
})

/** Consulta enviada à API; null enquanto não há âncora. */
export const relatorioConsultaAtom = atom<ConsultaRelatorio | null>((get) => {
  const f = get(relatorioFiltrosAtom)
  if (!f.ancora) return null
  return { ...f, ancora: f.ancora }
})

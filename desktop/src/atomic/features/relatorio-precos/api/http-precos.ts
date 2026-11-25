import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type { ConsultaPrecos, ResultadoPrecos } from '@server/relatorio/api-tipos'

/** Preços praticados: o retrato escolhido ou o que mais cobre o período (de, ate). */
export async function fetchPrecos(q: ConsultaPrecos, signal?: AbortSignal) {
  const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v)) as Record<
    string,
    string
  >
  return (await relatorioApiInstance.get<ResultadoPrecos>('/precos', { params, signal })).data
}

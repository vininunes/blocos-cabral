import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type { ConsultaRelatorio, EstadoBase, RespostaRelatorio } from '@server/relatorio/api-tipos'

export async function fetchRelatorio(consulta: ConsultaRelatorio, signal?: AbortSignal) {
  const response = await relatorioApiInstance.post<RespostaRelatorio>('/relatorio', consulta, {
    signal,
  })
  return response.data
}

export async function fetchEstadoBase(signal?: AbortSignal) {
  const response = await relatorioApiInstance.get<EstadoBase>('/base', { signal })
  return response.data
}

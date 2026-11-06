import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type { PedidoFeedback } from '@server/relatorio/api-tipos'

export async function salvarFeedback(pedido: PedidoFeedback) {
  const response = await relatorioApiInstance.put('/feedback', pedido)
  return response.data
}

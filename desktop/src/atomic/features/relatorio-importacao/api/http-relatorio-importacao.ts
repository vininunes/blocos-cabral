import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type { PedidoImportacao, RespostaImportacao } from '@server/relatorio/api-tipos'

export async function importarArquivos(pedido: PedidoImportacao) {
  const response = await relatorioApiInstance.post<RespostaImportacao>('/importacao', pedido)
  return response.data
}

export async function importarPasta() {
  const response = await relatorioApiInstance.post<RespostaImportacao>('/importacao/pasta')
  return response.data
}

export async function verificarArquivo(conteudo: string) {
  const response = await relatorioApiInstance.post<{ importadoComo: string | null }>(
    '/importacao/verificar',
    { conteudo }
  )
  return response.data.importadoComo
}

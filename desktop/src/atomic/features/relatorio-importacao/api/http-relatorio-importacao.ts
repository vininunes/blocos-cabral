import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type {
  PedidoImportacao,
  RespostaImportacao,
  RespostaVerificacao,
} from '@server/relatorio/api-tipos'

export async function importarArquivos(pedido: PedidoImportacao) {
  const response = await relatorioApiInstance.post<RespostaImportacao>('/importacao', pedido)
  return response.data
}

export async function importarPasta() {
  const response = await relatorioApiInstance.post<RespostaImportacao>('/importacao/pasta')
  return response.data
}

/** Tipo identificado pelo conteúdo e se o arquivo já foi importado antes. */
export async function verificarArquivo(nome: string, conteudo: string) {
  const response = await relatorioApiInstance.post<RespostaVerificacao>('/importacao/verificar', {
    nome,
    conteudo,
  })
  return response.data
}

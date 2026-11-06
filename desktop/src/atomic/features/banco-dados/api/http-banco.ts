import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type {
  ConteudoTabela,
  EstadoBanco,
  PedidoClientes,
  PedidoProvisaoLote,
  PedidoProvisoes,
  Provisao,
  RespostaClientes,
  RespostaDesfazer,
  TabelaBanco,
} from '@server/relatorio/api-tipos'

export async function fetchEstadoBanco(signal?: AbortSignal) {
  return (await relatorioApiInstance.get<EstadoBanco>('/banco', { signal })).data
}

export async function fetchTabelaBanco(tabela: TabelaBanco, signal?: AbortSignal) {
  return (await relatorioApiInstance.get<ConteudoTabela>(`/banco/tabela/${tabela}`, { signal }))
    .data
}

export async function fetchClientes(signal?: AbortSignal) {
  return (await relatorioApiInstance.get<RespostaClientes>('/banco/clientes', { signal })).data
}

export async function salvarClientes(pedido: PedidoClientes) {
  await relatorioApiInstance.put('/banco/clientes', pedido)
}

export async function desfazerImportacao(hash: string) {
  return (await relatorioApiInstance.delete<RespostaDesfazer>(`/banco/arquivos/${hash}`)).data
}

export async function fetchProvisoes(cliente: string, signal?: AbortSignal) {
  return (
    await relatorioApiInstance.get<Provisao[]>(`/banco/provisoes/${encodeURIComponent(cliente)}`, {
      signal,
    })
  ).data
}

export async function salvarProvisoes(cliente: string, pedido: PedidoProvisoes) {
  return (
    await relatorioApiInstance.put<Provisao[]>(
      `/banco/provisoes/${encodeURIComponent(cliente)}`,
      pedido
    )
  ).data
}

export async function lancarProvisaoEmLote(pedido: PedidoProvisaoLote) {
  return (await relatorioApiInstance.post<{ clientes: number }>('/banco/provisoes-lote', pedido))
    .data
}

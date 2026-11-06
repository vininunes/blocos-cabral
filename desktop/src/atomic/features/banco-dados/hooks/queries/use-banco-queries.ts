import type { TabelaBanco } from '@server/relatorio/api-tipos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RELATORIO_BASE_QUERY_KEY } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

import {
  desfazerImportacao,
  fetchClientes,
  fetchEstadoBanco,
  fetchProvisoes,
  fetchTabelaBanco,
  lancarProvisaoEmLote,
  salvarClientes,
  salvarProvisoes,
} from '../../api/http-banco'

// mesmo prefixo das queries do relatório: importar/desfazer/salvar invalida tudo de uma vez
const CHAVE = [...RELATORIO_BASE_QUERY_KEY, 'banco'] as const

export function useEstadoBancoQuery() {
  return useQuery({
    queryKey: [...CHAVE, 'estado'],
    queryFn: ({ signal }) => fetchEstadoBanco(signal),
    staleTime: Infinity,
  })
}

export function useTabelaBancoQuery(tabela: TabelaBanco) {
  return useQuery({
    queryKey: [...CHAVE, 'tabela', tabela],
    queryFn: ({ signal }) => fetchTabelaBanco(tabela, signal),
    staleTime: Infinity,
  })
}

export function useClientesQuery() {
  return useQuery({
    queryKey: [...CHAVE, 'clientes'],
    queryFn: ({ signal }) => fetchClientes(signal),
    staleTime: Infinity,
  })
}

export function useSalvarClientesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salvarClientes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

export function useDesfazerImportacaoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: desfazerImportacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

export function useProvisoesQuery(cliente: string | null) {
  return useQuery({
    queryKey: [...CHAVE, 'provisoes', cliente],
    queryFn: ({ signal }) => fetchProvisoes(cliente!, signal),
    enabled: cliente !== null,
    staleTime: 0,
  })
}

export function useSalvarProvisoesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      cliente,
      pedido,
    }: {
      cliente: string
      pedido: Parameters<typeof salvarProvisoes>[1]
    }) => salvarProvisoes(cliente, pedido),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

export function useLancarProvisaoEmLoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: lancarProvisaoEmLote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

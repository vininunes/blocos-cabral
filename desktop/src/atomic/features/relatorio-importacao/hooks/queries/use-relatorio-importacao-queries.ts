import { useMutation, useQueryClient } from '@tanstack/react-query'

import { RELATORIO_BASE_QUERY_KEY } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

import { importarArquivos, importarPasta } from '../../api/http-relatorio-importacao'

export function useImportarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pedido: Parameters<typeof importarArquivos>[0] | 'pasta') =>
      pedido === 'pasta' ? importarPasta() : importarArquivos(pedido),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

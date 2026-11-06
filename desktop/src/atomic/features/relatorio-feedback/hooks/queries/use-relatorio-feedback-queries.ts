import { useMutation, useQueryClient } from '@tanstack/react-query'

import { RELATORIO_BASE_QUERY_KEY } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

import { salvarFeedback } from '../../api/http-relatorio-feedback'

export function useSalvarFeedbackMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: salvarFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RELATORIO_BASE_QUERY_KEY }),
  })
}

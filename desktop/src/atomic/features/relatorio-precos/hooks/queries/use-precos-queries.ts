import type { ConsultaPrecos } from '@server/relatorio/api-tipos'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { RELATORIO_BASE_QUERY_KEY } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

import { fetchPrecos } from '../../api/http-precos'

/** Preços praticados; recarrega após importar ou desfazer (mesmo prefixo das queries da base). */
export function usePrecosQuery(q: ConsultaPrecos) {
  return useQuery({
    queryKey: [...RELATORIO_BASE_QUERY_KEY, 'precos', q],
    queryFn: ({ signal }) => fetchPrecos(q, signal),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'

import { relatorioConsultaAtom } from '@/atomic/features/relatorio-filtros/store/relatorio-filtros-state'

import { fetchEstadoBase, fetchRelatorio } from '../../api/http-relatorio'

/** Prefixo das queries que dependem da base (invalidadas após importar ou salvar feedback). */
export const RELATORIO_BASE_QUERY_KEY = ['relatorio'] as const

export function useEstadoBaseQuery() {
  return useQuery({
    queryKey: [...RELATORIO_BASE_QUERY_KEY, 'base'],
    queryFn: ({ signal }) => fetchEstadoBase(signal),
    staleTime: Infinity,
  })
}

/** Relatório dos filtros atuais; mantém o anterior na tela enquanto o novo carrega. */
export function useRelatorioQuery() {
  const consulta = useAtomValue(relatorioConsultaAtom)
  return useQuery({
    queryKey: [...RELATORIO_BASE_QUERY_KEY, 'relatorio', consulta],
    queryFn: ({ signal }) => fetchRelatorio(consulta!, signal),
    enabled: consulta !== null,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}

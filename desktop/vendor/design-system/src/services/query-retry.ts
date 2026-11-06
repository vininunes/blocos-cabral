import { isAxiosError } from 'axios'

const MAX_QUERY_RETRIES = 3

/**
 * Retry padrão das queries: repete erro de rede e 5xx (até 3x), mas NÃO 4xx —
 * 403/404/422 são respostas definitivas e cada query negada gerava 4 requests.
 * Exceções retentáveis: 408 (timeout) e 429 (rate limit). 401 também não: o
 * interceptor HTTP já faz refresh + 1 retry.
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined
  if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false
  }
  return failureCount < MAX_QUERY_RETRIES
}

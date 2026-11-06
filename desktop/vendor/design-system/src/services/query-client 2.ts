import { QueryClient } from '@tanstack/react-query'

import { retryUnlessClientError } from './query-retry'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 3 tentativas para rede/5xx; 4xx não repete (ver query-retry).
      retry: retryUnlessClientError,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 60000,
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'offlineFirst', // Continue serving stale data when offline
      throwOnError: false, // Don't throw errors to React - handle them in the query
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
      throwOnError: false,
    },
  },
})

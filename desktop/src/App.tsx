import { queryClient } from '@/services/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Provider as JotaiProvider } from 'jotai'

import { Toaster } from '@/atomic/base-components/sonner'
import { TooltipProvider } from '@/atomic/base-components/tooltip-base'

import { Relatorio } from '@/atomic/modules/relatorio'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <TooltipProvider delayDuration={300}>
          <Relatorio />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </JotaiProvider>
    </QueryClientProvider>
  )
}

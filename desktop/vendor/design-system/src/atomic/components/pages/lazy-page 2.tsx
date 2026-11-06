import { Suspense, type ReactNode } from 'react'

import { Loading } from '@/atomic/base-components/loading'

/**
 * Suspense padrão para o conteúdo de páginas carregadas com React.lazy nos
 * registries (admin/details). Os metadados (Page/SidebarDoc) continuam
 * síncronos para busca e filtro de escopo; só o componente da página vira
 * chunk próprio.
 */
export function LazyPageBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading text="" className="h-full w-full" />}>{children}</Suspense>
}

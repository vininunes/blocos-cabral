import { Loading } from '@/atomic/base-components/loading'

import { cn } from '@/lib/tailwind/utils'

/**
 * Loading padrão das seções do módulo details (o mesmo da seção de vessels):
 * spinner centralizado ocupando a área disponível. Usar em TODAS as seções
 * para a experiência ficar consistente.
 */
export function DetailsLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full items-center justify-center', className)}>
      <Loading />
    </div>
  )
}

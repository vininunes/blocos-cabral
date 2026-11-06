import { useEffect, useRef } from 'react'

import { toast } from 'sonner'

import { useEstadoBaseQuery } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

/** Avisa (uma vez) quando a base do app antigo foi trazida no primeiro uso. */
export function useAvisoMigracao() {
  const { data } = useEstadoBaseQuery()
  const avisado = useRef(false)
  useEffect(() => {
    const m = data?.migracao
    if (!m || avisado.current) return
    avisado.current = true
    toast.success('Base do app antigo importada', {
      description: `${m.propostas} propostas (${m.comFeedback} com feedback), ${m.pedidos} pedidos e ${m.notas} notas vieram de ${m.de}.`,
      duration: 15_000,
    })
  }, [data])
}

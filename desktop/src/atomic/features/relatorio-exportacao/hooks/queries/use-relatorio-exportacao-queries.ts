import type { ConsultaRelatorio } from '@server/relatorio/api-tipos'
import { useMutation } from '@tanstack/react-query'

import { exportar, type TipoExportacao } from '../../api/http-relatorio-exportacao'

export function useExportarMutation() {
  return useMutation({
    mutationFn: ({
      tipo,
      consulta,
    }: {
      tipo: TipoExportacao
      consulta: ConsultaRelatorio | null
    }) => exportar(tipo, consulta),
  })
}

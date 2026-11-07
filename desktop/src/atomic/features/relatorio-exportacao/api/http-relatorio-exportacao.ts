import { relatorioApiInstance } from '@/services/relatorio-api-instance'
import type { ArquivoGerado, ConsultaRelatorio } from '@server/relatorio/api-tipos'

export type TipoExportacao = 'ppt' | 'excel' | 'carteira' | 'base'

export async function exportar(tipo: TipoExportacao, consulta: ConsultaRelatorio | null) {
  const response = await relatorioApiInstance.post<ArquivoGerado>(
    `/exportar/${tipo}`,
    consulta ?? {}
  )
  return response.data
}

/** Abre o arquivo de saida/ no programa padrão (ou mostra na pasta). */
export async function abrirArquivo(nome: string, mostrarNaPasta = false) {
  await relatorioApiInstance.post(
    `/saida/${encodeURIComponent(nome)}/abrir${mostrarNaPasta ? '?mostrar=1' : ''}`
  )
}

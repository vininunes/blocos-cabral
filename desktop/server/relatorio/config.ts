/** Status do fluxo, mapa de situações do Bling e listas fixas (port de app/config.py). */

// cores do logo (sem #, como no PPT/Excel)
export const AZUL = '232F66'
export const VERDE = '1E6B34'
export const GRAFITE = '2E2A28'
export const CINZA = 'C8CBD2'
export const CINZA_CLARO = 'F4F2F7'
export const VERMELHO = 'C03D2B'

// status do fluxo
export const PROCESSO = 'Em processo'
export const APROVADO = 'Aprovado'
export const ENTREGUE = 'Entregue'
export const FATURADO = 'Faturado'
export const CANCELADO = 'Cancelado'
export const STATUS = [PROCESSO, APROVADO, ENTREGUE, FATURADO, CANCELADO] as const
export type Status = (typeof STATUS)[number]

/** situação no Bling (orçamentos, normalizada) -> status do fluxo */
export const MAPA_SITUACAO: Record<string, Status> = {
  rascunho: PROCESSO,
  aprovado: APROVADO,
  concluido: APROVADO,
  'nao aprovado': CANCELADO,
}

export const MOTIVOS = [
  'Preço',
  'Prazo de entrega',
  'Frete',
  'Concorrência',
  'Obra adiada',
  'Sem retorno do cliente',
  'Acompanhamento pós-venda',
  'Outro',
]

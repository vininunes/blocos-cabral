import {
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  Hourglass,
  Layers,
  ReceiptText,
  Truck,
  type LucideIcon,
} from 'lucide-react'

/** Ícone de cada status do fluxo (o mesmo do select de status do relatório). */
export const ICONE_STATUS: Record<string, LucideIcon> = {
  Todos: Layers,
  'Em processo': Hourglass,
  Aprovado: CircleCheck,
  Entregue: Truck,
  Faturado: ReceiptText,
  Cancelado: CircleX,
}

/** Etapas do funil e outros rótulos que equivalem a um status. */
const SINONIMOS: [RegExp, LucideIcon][] = [
  [/^propostas emitidas/i, FileText],
  [/^em processo/i, Hourglass],
  [/^aprovad/i, CircleCheck],
  [/^com pedido, aguardando nota/i, Clock],
  [/^entregue/i, Truck],
  [/^faturad/i, ReceiptText],
  [/^cancelad/i, CircleX],
]

/**
 * Ícone do status no começo do texto (ex.: 'Faturado (ped. 37893)', 'Aprovadas',
 * 'Entregues (com nota)'); null se o texto não começa com um status.
 */
export function iconeDoStatus(texto: unknown): LucideIcon | null {
  if (typeof texto !== 'string' || !texto) return null
  if (ICONE_STATUS[texto]) return ICONE_STATUS[texto]
  return SINONIMOS.find(([re]) => re.test(texto.trim()))?.[1] ?? null
}

import {
  Building2,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Package,
  TableProperties,
  Target,
  UserRound,
} from 'lucide-react'

/** Abas do relatório: os indicadores (cartões) primeiro, depois as demais. */
export const RELATORIO_TABS = [
  { value: 'indicadores', icon: Gauge },
  { value: 'visao-geral', icon: LayoutDashboard },
  { value: 'pedidos', icon: ClipboardList },
  { value: 'vendedores', icon: UserRound },
  { value: 'clientes', icon: Building2 },
  { value: 'produtos', icon: Package },
  { value: 'cidades', icon: MapPin },
  { value: 'provisao', icon: Target },
  { value: 'detalhamento', icon: TableProperties },
  { value: 'feedback', icon: MessageSquareText },
] as const

export type RelatorioTab = (typeof RELATORIO_TABS)[number]['value']

/** Abas que mostram a base inteira (sem filtro de período nem comparação). */
export const ABAS_BASE_INTEIRA: ReadonlySet<RelatorioTab> = new Set([
  'pedidos',
  'vendedores',
  'clientes',
  'produtos',
  'cidades',
  'provisao',
  'detalhamento',
])

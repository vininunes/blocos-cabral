import {
  Building2,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Package,
  TableProperties,
  Tags,
  Target,
  Truck,
  UserRound,
} from 'lucide-react'

/** Abas do relatório: os indicadores (cartões) primeiro, depois as demais. */
export const RELATORIO_TABS = [
  { value: 'indicadores', icon: Gauge },
  { value: 'visao-geral', icon: LayoutDashboard },
  { value: 'pedidos', icon: ClipboardList },
  { value: 'acompanhamento', icon: Truck },
  { value: 'vendedores', icon: UserRound },
  { value: 'clientes', icon: Building2 },
  { value: 'produtos', icon: Package },
  { value: 'precos', icon: Tags },
  { value: 'cidades', icon: MapPin },
  { value: 'provisao', icon: Target },
  { value: 'detalhamento', icon: TableProperties },
  { value: 'feedback', icon: MessageSquareText },
] as const

export type RelatorioTab = (typeof RELATORIO_TABS)[number]['value']

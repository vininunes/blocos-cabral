import { useTime } from '@/hooks/use-time'

/**
 * Célula "última atualização" das tabelas de admin: o `updated_at` do registro
 * em tempo RELATIVO ("há 10 minutos"), com a data absoluta no tooltip.
 *
 * Não confundir com o `LastUpdate` deste mesmo diretório: aquele é o indicador
 * VIVO de telemetria (tick por segundo, ciente do player) — numa tabela de
 * cadastro isso seria re-render por segundo à toa. Aqui o relativo é calculado
 * no render e se atualiza junto com a tabela (busca, filtro, refetch).
 *
 * Na coluna, ordene pelo instante real, nunca pelo texto:
 *
 *     accessorFn: (row) => new Date(row.updated_at).getTime()
 */
export function LastUpdateCell({ date }: { date?: string | null }) {
  const { formatRelativeTime, formatDateTime } = useTime()

  if (!date) return <span className="text-muted-foreground">-</span>

  return (
    <div className="whitespace-nowrap text-muted-foreground" title={formatDateTime(date)}>
      {formatRelativeTime(date)}
    </div>
  )
}

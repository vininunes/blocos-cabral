/** Legenda simples (círculo + nome), no topo dos gráficos. */
export function Legenda({
  itens,
}: {
  itens: { nome: string; cor: string; tracejado?: boolean }[]
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      {itens.map((i) => (
        <span key={i.nome} className="flex items-center gap-1.5">
          {i.tracejado ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.cor }} />
          ) : (
            <span className="size-2.5 rounded-full" style={{ background: i.cor }} />
          )}
          {i.nome}
        </span>
      ))}
    </div>
  )
}

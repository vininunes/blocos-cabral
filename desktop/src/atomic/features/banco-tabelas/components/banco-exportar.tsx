import { exportarTabela } from '@/atomic/features/banco-dados/api/http-banco'
import { abrirArquivo } from '@/atomic/features/relatorio-exportacao/api/http-relatorio-exportacao'
import type { PedidoExportarTabela } from '@server/relatorio/api-tipos'
import { fmtNum } from '@server/relatorio/utils'
import { useMutation } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'

/**
 * Exportar a tabela da aba em .xlsx: as linhas que estão na tela (busca e ordenação). O arquivo
 * vai para saida/, com o aviso para abrir ou mostrar na pasta (como o menu Exportar).
 */
export function BancoExportar({ pedido }: { pedido: () => PedidoExportarTabela }) {
  const exportar = useMutation({ mutationFn: exportarTabela })
  return (
    <Button
      variant="outline"
      className="h-9"
      disabled={exportar.isPending}
      onClick={() => {
        const p = pedido()
        exportar.mutate(p, {
          onSuccess: ({ nome }) =>
            toast.success(`${p.nome} exportado`, {
              description: `${fmtNum(p.linhas.length)} linhas · ${nome} · salvo na pasta saida/`,
              duration: 12_000,
              action: { label: 'Abrir', onClick: () => void abrirArquivo(nome) },
              cancel: { label: 'Mostrar na pasta', onClick: () => void abrirArquivo(nome, true) },
            }),
        })
      }}
    >
      {exportar.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="size-4" />
      )}
      {exportar.isPending ? 'Exportando…' : 'Exportar (.xlsx)'}
    </Button>
  )
}

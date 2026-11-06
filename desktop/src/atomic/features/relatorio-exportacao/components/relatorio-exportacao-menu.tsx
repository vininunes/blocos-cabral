import { useAtomValue } from 'jotai'
import { Database, Download, FileSpreadsheet, Loader2, Presentation } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'

import { relatorioConsultaAtom } from '@/atomic/features/relatorio-filtros/store/relatorio-filtros-state'

import { abrirArquivo, type TipoExportacao } from '../api/http-relatorio-exportacao'
import { useExportarMutation } from '../hooks/queries/use-relatorio-exportacao-queries'

const ROTULO: Record<TipoExportacao, string> = {
  ppt: 'PowerPoint gerado',
  excel: 'Excel gerado',
  base: 'Base exportada',
}

/**
 * Exportar: PowerPoint e Excel do relatório na tela (período, comparação e status) e a
 * base inteira em .xlsx. Os arquivos ficam em saida/; o aviso permite abrir ou mostrar na pasta.
 */
export function RelatorioExportacaoMenu() {
  const consulta = useAtomValue(relatorioConsultaAtom)
  const exportar = useExportarMutation()

  const gerar = (tipo: TipoExportacao) =>
    exportar.mutate(
      { tipo, consulta: tipo === 'base' ? null : consulta },
      {
        onSuccess: ({ nome }) =>
          toast.success(ROTULO[tipo], {
            description: `${nome} · salvo na pasta saida/`,
            duration: 12_000,
            action: { label: 'Abrir', onClick: () => void abrirArquivo(nome) },
            cancel: { label: 'Mostrar na pasta', onClick: () => void abrirArquivo(nome, true) },
          }),
      }
    )

  return (
    <DropdownMenu>
      {/* mesmo float card e botão das abas (PageActionTabs / page actions) */}
      <FloatCard className="flex h-9 items-center px-1">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
            disabled={exportar.isPending}
          >
            {exportar.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {exportar.isPending ? 'Gerando…' : 'Exportar'}
          </Button>
        </DropdownMenuTrigger>
      </FloatCard>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Relatório (período e filtros atuais)
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={!consulta} onSelect={() => gerar('ppt')}>
          <Presentation className="size-4" /> PowerPoint (.pptx)
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!consulta} onSelect={() => gerar('excel')}>
          <FileSpreadsheet className="size-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => gerar('base')}>
          <Database className="size-4" /> Base completa (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

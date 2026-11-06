import { useState } from 'react'

import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import { ConfirmationDialog } from '@/atomic/base-components/confirmation-dialog'
import { Loading } from '@/atomic/base-components/loading'
import Tooltip from '@/atomic/base-components/tooltip'

import { RelatorioImportacaoDialog } from '@/atomic/features/relatorio-importacao/components/relatorio-importacao-dialog'

import {
  useDesfazerImportacaoMutation,
  useTabelaBancoQuery,
} from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { BancoTabela } from './banco-tabela'

/** Arquivos importados: importar qualquer arquivo do Bling e desfazer uma importação. */
export function BancoArquivos() {
  const { data, isPending } = useTabelaBancoQuery('arquivos')
  const desfazer = useDesfazerImportacaoMutation()
  const [alvo, setAlvo] = useState<{ hash: string; arquivo: string } | null>(null)
  if (isPending || !data) return <Loading text="" className="h-48" />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="shrink-0 text-xs text-muted-foreground">
        Cada arquivo importado do Bling. Desfazer tira da base o que veio só daquele arquivo: a base
        é refeita com os demais (a partir das cópias em entrada/), mantendo o feedback e as
        correções feitas à mão.
      </p>
      <BancoTabela
        conteudo={data}
        ferramentas={<RelatorioImportacaoDialog rotulo="Importar arquivos" />}
        acoes={(l) => (
          <Tooltip text="Desfazer importação">
            <Button
              variant="ghost"
              size="icon"
              disabled={desfazer.isPending}
              onClick={() => setAlvo({ hash: String(l.hash), arquivo: String(l.arquivo) })}
            >
              <Undo2 className="size-4" />
            </Button>
          </Tooltip>
        )}
      />
      <ConfirmationDialog
        open={alvo !== null}
        onOpenChange={(v) => !v && setAlvo(null)}
        variant="destructive"
        title="Desfazer importação?"
        description={`Os registros que vieram só de "${alvo?.arquivo}" saem da base. O arquivo continua na pasta entrada/ e pode ser importado de novo.`}
        confirmLabel="Desfazer"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (!alvo) return
          desfazer.mutate(alvo.hash, {
            onSuccess: (r) =>
              toast.success('Importação desfeita', {
                description: `${r.removido} saiu da base: agora são ${r.propostas} propostas, ${r.pedidos} pedidos e ${r.notas} notas.`,
              }),
          })
          setAlvo(null)
        }}
      />
    </div>
  )
}

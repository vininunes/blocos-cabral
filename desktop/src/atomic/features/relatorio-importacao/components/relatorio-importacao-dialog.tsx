import { useState } from 'react'

import type { RespostaImportacao, TipoArquivo } from '@server/relatorio/api-tipos'
import { CircleAlert, CircleCheck, FileUp, FolderInput, Info, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/atomic/base-components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/atomic/base-components/dialog'
import Tooltip from '@/atomic/base-components/tooltip'

import { Dropzone } from '@/atomic/components/dropzone'

import { verificarArquivo } from '../api/http-relatorio-importacao'
import { arquivoBase64 } from '../helpers/base64'
import { useImportarMutation } from '../hooks/queries/use-relatorio-importacao-queries'

const ARQUIVOS: { tipo: TipoArquivo; formatos: string[] }[] = [
  { tipo: 'orcamentos', formatos: ['.csv'] },
  { tipo: 'vendas', formatos: ['.csv'] },
  { tipo: 'notas', formatos: ['.pdf'] },
  { tipo: 'contatos', formatos: ['.csv'] },
]

type Escolhido = { nome: string; conteudo: string; importadoComo: string | null }

function Resultado({ r }: { r: RespostaImportacao }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 text-sm">
      {r.importados.length > 0 && (
        <div className="rounded-md border border-cabral-verde/40 bg-cabral-verde/10 p-3">
          <div className="flex items-center gap-2 font-semibold">
            <CircleCheck className="size-4 text-cabral-verde" />{' '}
            {t('relatorioImportacao.importados')}
          </div>
          <ul className="ml-6 list-disc text-xs">
            {r.importados.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('relatorioImportacao.resumo', {
              novas: r.novas_propostas,
              mudancas: r.mudancas,
              notas: r.ligacoes?.notas_pedidos ?? 0,
              propostas: r.ligacoes?.propostas_pedidos ?? 0,
            })}
          </p>
        </div>
      )}
      {r.ignorados.length > 0 && (
        <div className="rounded-md border p-3 text-xs">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Info className="size-4" /> {t('relatorioImportacao.ignorados')}
          </div>
          <ul className="ml-6 list-disc">
            {r.ignorados.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {r.erros.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <div className="mb-1 flex items-center gap-2 font-semibold text-destructive">
            <CircleAlert className="size-4" /> {t('relatorioImportacao.erros')}
          </div>
          <ul className="ml-6 list-disc">
            {r.erros.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Botão + diálogo de importação. Sem `tipos`, aceita os quatro arquivos do Bling; na tela
 * Banco de dados cada tabela abre só o seu (ex.: Notas -> PDF de notas).
 */
export function RelatorioImportacaoDialog({
  variante = 'default',
  tipos = ['orcamentos', 'vendas', 'notas', 'contatos'],
  rotulo,
  pasta = true,
}: {
  variante?: 'default' | 'outline'
  tipos?: TipoArquivo[]
  rotulo?: string
  /** Mostrar "Ler pasta entrada/". */
  pasta?: boolean
}) {
  const { t } = useTranslation()
  const [aberto, setAberto] = useState(false)
  const [escolhidos, setEscolhidos] = useState<Partial<Record<TipoArquivo, Escolhido>>>({})
  const importar = useImportarMutation()
  const resultado = importar.data

  const escolher = async (tipo: TipoArquivo, file: File) => {
    const conteudo = await arquivoBase64(file)
    const importadoComo = await verificarArquivo(conteudo).catch(() => null)
    setEscolhidos((e) => ({ ...e, [tipo]: { nome: file.name, conteudo, importadoComo } }))
  }
  const lista = Object.entries(escolhidos) as [TipoArquivo, Escolhido][]
  const fechar = (v: boolean) => {
    setAberto(v)
    if (!v) {
      setEscolhidos({})
      importar.reset()
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogTrigger asChild>
        <Button variant={variante} className="h-8">
          <Upload className="size-4" />
          {rotulo ?? t('relatorioImportacao.botao')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {resultado ? t('relatorioImportacao.resultado') : t('relatorioImportacao.titulo')}
          </DialogTitle>
          {!resultado && (
            <DialogDescription>{t('relatorioImportacao.descricao')}</DialogDescription>
          )}
        </DialogHeader>

        {resultado ? (
          <Resultado r={resultado} />
        ) : (
          <div className="space-y-3">
            {ARQUIVOS.filter((a) => tipos.includes(a.tipo)).map(({ tipo, formatos }) => {
              const e = escolhidos[tipo]
              return (
                <div key={tipo} className="space-y-1">
                  <div className="text-sm font-medium">{t(`relatorioImportacao.${tipo}`)}</div>
                  {e ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <FileUp className="size-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate">{e.nome}</span>
                      <Tooltip text={t('relatorioImportacao.remover')}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEscolhidos((x) => ({ ...x, [tipo]: undefined }))}
                        >
                          <X className="size-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  ) : (
                    <Dropzone
                      acceptFormats={formatos}
                      onChange={(files) => files[0] && void escolher(tipo, files[0])}
                      className="relative h-16 w-full"
                    >
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        {t('relatorioImportacao.soltar')}
                      </div>
                    </Dropzone>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {e?.importadoComo
                      ? `⚠️ ${t('relatorioImportacao.jaImportado', { nome: e.importadoComo })}`
                      : t(`relatorioImportacao.${tipo}Ajuda`)}
                  </p>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">{t('relatorioImportacao.repetidos')}</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {resultado ? (
            <Button onClick={() => fechar(false)}>{t('relatorioImportacao.fechar')}</Button>
          ) : (
            <>
              {pasta && (
                <Tooltip text={t('relatorioImportacao.lerPastaAjuda')}>
                  <Button
                    variant="outline"
                    disabled={importar.isPending}
                    onClick={() => importar.mutate('pasta')}
                  >
                    <FolderInput className="size-4" />
                    {t('relatorioImportacao.lerPasta')}
                  </Button>
                </Tooltip>
              )}
              <Button variant="outline" onClick={() => fechar(false)}>
                {t('relatorioImportacao.cancelar')}
              </Button>
              <Button
                disabled={!lista.length || importar.isPending}
                onClick={() =>
                  importar.mutate({
                    arquivos: lista.map(([tipo, e]) => ({
                      nome: e.nome,
                      tipo,
                      conteudo: e.conteudo,
                    })),
                  })
                }
              >
                {importar.isPending
                  ? t('relatorioImportacao.importando')
                  : t('relatorioImportacao.importar')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

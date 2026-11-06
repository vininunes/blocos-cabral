import { useRef, useState } from 'react'

import type { RespostaImportacao, TipoArquivo } from '@server/relatorio/api-tipos'
import {
  CircleAlert,
  CircleCheck,
  FileUp,
  FolderInput,
  Info,
  LoaderCircle,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
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

import { cn } from '@/lib/tailwind/utils'

import { verificarArquivo } from '../api/http-relatorio-importacao'
import { arquivoBase64 } from '../helpers/base64'
import { useImportarMutation } from '../hooks/queries/use-relatorio-importacao-queries'

const FORMATOS: Record<TipoArquivo, string> = {
  orcamentos: '.csv',
  vendas: '.csv',
  notas: '.pdf',
  contatos: '.csv',
}
const TODOS: TipoArquivo[] = ['orcamentos', 'vendas', 'notas', 'contatos']

/** Um arquivo escolhido, com o que a API identificou antes de importar. */
type Escolhido = {
  id: number
  nome: string
  conteudo: string | null
  verificando: boolean
  tipo: TipoArquivo | null
  importadoComo: string | null
  falhou: boolean
}

type Situacao =
  | { vai: true }
  | { vai: false; aviso: 'verificando' | 'falha' | 'naoReconhecido' | 'outroTipo' | 'jaImportado' }
  | { vai: false; aviso: 'repetido'; de: string }

/** Se o arquivo vai ser importado ou, se não, por quê. */
function situacoes(lista: Escolhido[], tipos: TipoArquivo[]): Situacao[] {
  const vistos = new Map<string, string>()
  return lista.map((e) => {
    if (e.verificando) return { vai: false, aviso: 'verificando' }
    if (e.falhou || e.conteudo === null) return { vai: false, aviso: 'falha' }
    if (!e.tipo) return { vai: false, aviso: 'naoReconhecido' }
    if (!tipos.includes(e.tipo)) return { vai: false, aviso: 'outroTipo' }
    if (e.importadoComo) return { vai: false, aviso: 'jaImportado' }
    const igual = vistos.get(e.conteudo)
    if (igual) return { vai: false, aviso: 'repetido', de: igual }
    vistos.set(e.conteudo, e.nome)
    return { vai: true }
  })
}

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

/** Linha da lista de escolhidos: nome, tipo identificado, aviso e remover. */
function LinhaArquivo({ e, s, remover }: { e: Escolhido; s: Situacao; remover: () => void }) {
  const { t } = useTranslation()
  const tipoCurto = (tipo: TipoArquivo) => t(`relatorioImportacao.tipoCurto.${tipo}`)
  let aviso: string | null = null
  if (!s.vai) {
    if (s.aviso === 'verificando') aviso = t('relatorioImportacao.verificando')
    else if (s.aviso === 'falha') aviso = t('relatorioImportacao.falhaLeitura')
    else if (s.aviso === 'naoReconhecido') aviso = t('relatorioImportacao.naoReconhecido')
    else if (s.aviso === 'outroTipo')
      aviso = t('relatorioImportacao.outroTipo', { tipo: tipoCurto(e.tipo!).toLowerCase() })
    else if (s.aviso === 'jaImportado')
      aviso = t('relatorioImportacao.jaImportado', { nome: e.importadoComo })
    else if (s.aviso === 'repetido')
      aviso = t('relatorioImportacao.repetidoSelecao', { nome: s.de })
  }
  const alerta = !s.vai && s.aviso !== 'verificando'
  return (
    <li className="flex items-start gap-2 px-3 py-2 text-sm">
      {s.vai || !alerta ? (
        e.verificando ? (
          <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <FileUp className="mt-0.5 size-4 shrink-0 text-primary" />
        )
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate', alerta && 'text-muted-foreground')}>{e.nome}</span>
          {e.tipo && (
            <span className="shrink-0 rounded-full border px-2 py-px text-[11px] text-muted-foreground">
              {tipoCurto(e.tipo)}
            </span>
          )}
        </div>
        {aviso && (
          <p className={cn('text-xs', alerta ? 'text-amber-700' : 'text-muted-foreground')}>
            {aviso}
          </p>
        )}
      </div>
      <Tooltip text={t('relatorioImportacao.remover')}>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={remover}>
          <X className="size-4" />
        </Button>
      </Tooltip>
    </li>
  )
}

/**
 * Botão + diálogo de importação em lote. Sem `tipos`, aceita os quatro arquivos do Bling
 * misturados (o tipo de cada um vem do conteúdo); na tela Banco de dados cada tabela abre só o
 * seu (ex.: Notas -> vários PDFs de notas) e avisa quando um arquivo é de outro tipo.
 */
export function RelatorioImportacaoDialog({
  variante = 'default',
  tipos = TODOS,
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
  const [lista, setLista] = useState<Escolhido[]>([])
  const proximoId = useRef(0)
  const importar = useImportarMutation()
  const resultado = importar.data

  const formatos = [...new Set(tipos.map((tipo) => FORMATOS[tipo]))]
  const sits = situacoes(lista, tipos)
  const aImportar = lista.filter((_, i) => sits[i].vai)

  const atualizar = (id: number, mudanca: Partial<Escolhido>) =>
    setLista((l) => l.map((e) => (e.id === id ? { ...e, ...mudanca } : e)))

  const adicionar = (files: File[]) => {
    for (const file of files) {
      const id = proximoId.current++
      setLista((l) => [
        ...l,
        {
          id,
          nome: file.name,
          conteudo: null,
          verificando: true,
          tipo: null,
          importadoComo: null,
          falhou: false,
        },
      ])
      void (async () => {
        try {
          const conteudo = await arquivoBase64(file)
          const v = await verificarArquivo(file.name, conteudo)
          atualizar(id, { conteudo, verificando: false, ...v })
        } catch {
          atualizar(id, { verificando: false, falhou: true })
        }
      })()
    }
  }

  const fechar = (v: boolean) => {
    setAberto(v)
    if (!v) {
      setLista([])
      importar.reset()
    }
  }

  const umTipo = tipos.length === 1 ? tipos[0] : null

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
            <DialogDescription>
              {umTipo
                ? t('relatorioImportacao.descricaoTipo', {
                    tipo: t(`relatorioImportacao.tipoCurto.${umTipo}`).toLowerCase(),
                  })
                : t('relatorioImportacao.descricao')}
            </DialogDescription>
          )}
        </DialogHeader>

        {resultado ? (
          <Resultado r={resultado} />
        ) : (
          <div className="min-w-0 space-y-3">
            <Dropzone
              acceptFormats={formatos}
              onChange={adicionar}
              className="relative h-20 w-full"
            >
              <div className="flex h-full flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
                <span>{t('relatorioImportacao.soltar')}</span>
                <span className="text-[11px]">
                  {t('relatorioImportacao.soltarFormatos', {
                    formatos: formatos.map((f) => f.slice(1).toUpperCase()).join(' e '),
                  })}
                </span>
              </div>
            </Dropzone>

            {lista.length > 0 && (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border bg-muted/30">
                {lista.map((e, i) => (
                  <LinhaArquivo
                    key={e.id}
                    e={e}
                    s={sits[i]}
                    remover={() => setLista((l) => l.filter((x) => x.id !== e.id))}
                  />
                ))}
              </ul>
            )}

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {t('relatorioImportacao.comoExportar')}
              </div>
              {tipos.map((tipo) => (
                <p key={tipo}>
                  <span className="font-medium">{t(`relatorioImportacao.tipoCurto.${tipo}`)}:</span>{' '}
                  {t(`relatorioImportacao.${tipo}Ajuda`)}
                </p>
              ))}
            </div>
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
                disabled={!aImportar.length || importar.isPending}
                onClick={() =>
                  importar.mutate({
                    arquivos: aImportar.map((e) => ({
                      nome: e.nome,
                      tipo: e.tipo!,
                      conteudo: e.conteudo!,
                    })),
                  })
                }
              >
                {importar.isPending
                  ? t('relatorioImportacao.importando')
                  : aImportar.length
                    ? t('relatorioImportacao.importarN', { count: aImportar.length })
                    : t('relatorioImportacao.importar')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

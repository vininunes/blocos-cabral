import { useMemo } from 'react'

import { ColumnDef } from '@tanstack/react-table'
import { Download, ExternalLink, File, Loader2, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BadgeBase } from '@/atomic/base-components/badge-base'
import { Button } from '@/atomic/base-components/button'
import { Card } from '@/atomic/base-components/card'
import { DataTable } from '@/atomic/base-components/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'

import { Dropzone } from '@/atomic/components/dropzone'
import { LastUpdateCell } from '@/atomic/components/last-update/last-update-cell'

import { useDataTable } from '@/hooks/use-data-table'

import { getFileExtension } from './file-extension'

/**
 * Item exibido pelo painel. A casca não conhece o domínio — quem a usa mapeia
 * o próprio modelo (anexo de porto, de embarcação, de alerta…) para esta forma.
 */
export type AttachmentPanelItem = {
  id: string | number
  filename: string
  /** Tamanho em bytes; omitido quando a origem não informa. */
  sizeBytes?: number
  /** Formato (extensão) exibido na tabela; derivado do nome quando omitido. */
  format?: string
  /** Quando o arquivo foi anexado (ISO); omitido quando a origem não informa. */
  uploadedAt?: string
  /** Formato que o navegador exibe (pdf, png…): o nome vira link e a linha
   *  ganha "abrir em nova guia" via `onOpen`. */
  viewable?: boolean
}

export interface AttachmentsPanelProps<T extends AttachmentPanelItem> {
  items: T[]
  /** Extensões aceitas no dropzone (ex.: ['.pdf', '.png']). */
  acceptFormats: string[]
  /** Libera upload e exclusão. Quem usa a casca decide (normalmente pelo escopo da feature hospedeira). */
  canWrite?: boolean
  isLoading?: boolean
  isUploading?: boolean
  isDeleting?: boolean
  onUpload: (files: File[]) => void
  onDelete: (item: T) => void
  /** Abrir o arquivo em nova guia (itens `viewable`). Sem handler, nada é clicável. */
  onOpen?: (item: T) => void
  /** Ação de download do conteúdo do anexo. Sem handler, a coluna de ações não mostra download. */
  onDownload?: (item: T) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Casca compartilhada de anexos: dropzone de upload + tabela de arquivos
 * (nome, formato, tamanho, data) com download e exclusão. Não faz requisição
 * nem conhece escopo — recebe os itens e as ações de quem a hospeda (ver
 * `atomic/features/attachment` para o binding padrão da API de anexos).
 */
export function AttachmentsPanel<T extends AttachmentPanelItem>({
  items,
  acceptFormats,
  canWrite = true,
  isLoading = false,
  isUploading = false,
  isDeleting = false,
  onUpload,
  onDelete,
  onOpen,
  onDownload,
}: AttachmentsPanelProps<T>) {
  const { t } = useTranslation()

  const columns = useMemo<ColumnDef<T>[]>(
    () => [
      {
        accessorKey: 'filename',
        header: t('details-attachments-file'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            {row.original.viewable && onOpen ? (
              <button
                type="button"
                className="font-medium truncate text-left underline underline-offset-2 decoration-muted-foreground/60 hover:decoration-current cursor-pointer"
                title={t('details-attachments-open-new-tab')}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(row.original)
                }}
              >
                {row.original.filename}
              </button>
            ) : (
              <span className="font-medium truncate">{row.original.filename}</span>
            )}
          </div>
        ),
      },
      {
        id: 'format',
        accessorFn: (row) => row.format ?? getFileExtension(row.filename),
        header: t('details-attachments-format'),
        cell: ({ row }) => {
          const format = row.original.format ?? getFileExtension(row.original.filename)
          if (!format) return <span className="text-muted-foreground">-</span>
          return (
            <BadgeBase variant="outline" className="px-1.5 py-0 text-[10px] uppercase">
              {format}
            </BadgeBase>
          )
        },
      },
      {
        id: 'size',
        accessorFn: (row) => row.sizeBytes ?? 0,
        header: t('details-attachments-size'),
        cell: ({ row }) =>
          row.original.sizeBytes !== undefined ? (
            <span className="tabular-nums text-muted-foreground">
              {formatFileSize(row.original.sizeBytes)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'uploadedAt',
        accessorFn: (row) => (row.uploadedAt ? new Date(row.uploadedAt).getTime() : 0),
        header: t('details-attachments-uploaded-at'),
        cell: ({ row }) =>
          row.original.uploadedAt ? (
            <LastUpdateCell date={row.original.uploadedAt} />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
    ],
    [t, onOpen]
  )

  const { table } = useDataTable<T>(items, columns, {
    pageSize: 100,
    initialSorting: [{ id: 'uploadedAt', desc: true }],
  })

  return (
    <div className="flex flex-col gap-2">
      {/* Dropzone Card */}
      <Card className={`overflow-hidden p-2 ${!canWrite ? 'opacity-60' : ''}`}>
        <Dropzone
          acceptFormats={acceptFormats}
          onChange={onUpload}
          dragDropDisabled={!canWrite}
          selectFileDisabled={!canWrite}
          className={`w-full h-48 relative rounded-lg border-2 border-dashed border-muted-foreground/25 transition-all ${canWrite ? 'hover:border-primary/50 hover:bg-muted/30 cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-2">
            {isUploading ? (
              <>
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {t('details-attachments-uploading')}
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="size-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t('details-attachments-description')}
                  </p>
                  <p className="text-xs mt-1">{t('details-attachments-formats')}</p>
                </div>
              </>
            )}
          </div>
        </Dropzone>
      </Card>

      {/* Files table Card */}
      <Card className="overflow-hidden">
        <div className="p-2 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {t('details-attachments-title')}{' '}
            {items.length > 0 && (
              <span className="text-muted-foreground font-normal">({items.length})</span>
            )}
          </h3>
        </div>
        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-2" />
            <p className="text-sm">{t('details-attachments-loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <File className="size-10 mb-2 opacity-30" />
            <p className="text-sm">{t('details-attachments-empty')}</p>
          </div>
        ) : (
          <DataTable
            className="p-2"
            transparent
            disableColumnReorder
            table={table}
            getRowClassName={(row) => (onOpen && row.original.viewable ? 'cursor-pointer' : '')}
            onRowClick={onOpen ? (row) => row.original.viewable && onOpen(row.original) : undefined}
            renderRowActions={(row) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                    <span className="sr-only">{t('details-attachments-actions-menu')}</span>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>{t('details-attachments-actions-label')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {row.original.viewable && onOpen && (
                    <DropdownMenuItem onClick={() => onOpen(row.original)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('details-attachments-open-new-tab')}
                    </DropdownMenuItem>
                  )}
                  {onDownload && (
                    <DropdownMenuItem onClick={() => onDownload(row.original)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('details-attachments-download')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isDeleting || !canWrite}
                    onClick={() => onDelete(row.original)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('details-attachments-delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )}
      </Card>
    </div>
  )
}

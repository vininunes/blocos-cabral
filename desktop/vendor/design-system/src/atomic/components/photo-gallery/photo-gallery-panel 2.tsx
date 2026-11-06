import { useEffect, useRef, useState } from 'react'

import { ImageOff, Loader2, MoreVertical, Star, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/atomic/base-components/button'
import { Card } from '@/atomic/base-components/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/atomic/base-components/carousel'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/atomic/base-components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import Tooltip from '@/atomic/base-components/tooltip'

/**
 * Foto exibida pelo painel. A casca não conhece o domínio — quem a usa mapeia
 * o próprio modelo (foto de embarcação, de porto…) para esta forma.
 */
export interface PhotoPanelItem {
  id: string | number
  url: string
  isDefault?: boolean
}

export interface PhotoGalleryPanelProps<T extends PhotoPanelItem> {
  photos: T[]
  /** Extensões aceitas no seletor de arquivo (ex.: '.jpg,.png'). */
  acceptFormats: string
  /** Libera upload, definir padrão e excluir. Quem usa a casca decide (normalmente pelo escopo da feature hospedeira). */
  canWrite?: boolean
  isLoading?: boolean
  isUploading?: boolean
  isSettingDefault?: boolean
  isDeleting?: boolean
  onUpload: (files: File[]) => void
  onSetDefault: (photo: T) => void
  /**
   * Exclusão. Se retornar Promise, o diálogo de confirmação só fecha quando ela
   * resolve — mantendo o diálogo aberto em caso de erro.
   */
  onDelete: (photo: T) => void | Promise<unknown>
}

/**
 * Casca compartilhada de galeria de fotos: foto principal, carrossel com todas
 * as fotos, upload, definir padrão e excluir (com confirmação). Não faz
 * requisição nem conhece escopo — recebe as fotos e as ações de quem a hospeda
 * (ver `atomic/features/photo-gallery` para os bindings padrão).
 */
export function PhotoGalleryPanel<T extends PhotoPanelItem>({
  photos,
  acceptFormats,
  canWrite = true,
  isLoading = false,
  isUploading = false,
  isSettingDefault = false,
  isDeleting = false,
  onUpload,
  onSetDefault,
  onDelete,
}: PhotoGalleryPanelProps<T>) {
  const { t } = useTranslation()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<T | null>(null)
  const [imageLoading, setImageLoading] = useState(true)

  const defaultPhoto = photos.find((photo) => photo.isDefault) ?? photos[0]

  // Reset image loading state when photo changes
  useEffect(() => {
    if (defaultPhoto) {
      setImageLoading(true)
    }
  }, [defaultPhoto?.url])

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    onUpload(Array.from(files))

    // Reset input value so same file can be uploaded again
    event.target.value = ''
  }

  async function handleDeleteConfirm() {
    if (!photoToDelete) return

    try {
      await onDelete(photoToDelete)
    } catch {
      // Falha já reportada por quem hospeda a casca — mantém o diálogo aberto.
      return
    }
    setDeleteDialogOpen(false)
    setPhotoToDelete(null)
  }

  function openDeleteDialog(photo: T) {
    setPhotoToDelete(photo)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <Card className="overflow-hidden flex flex-col">
        {/* Main Image Area */}
        <div className="group relative aspect-video bg-muted/30 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : defaultPhoto ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <img
                src={defaultPhoto.url}
                alt={t('photo-gallery-title')}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ImageOff className="size-10 opacity-30" />
              <p className="text-sm">{t('photo-gallery-empty')}</p>
            </div>
          )}

          {/* Action Buttons (hover) — no TOPO da foto */}
          <div className="absolute inset-x-0 top-0 p-2 flex gap-2 bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={acceptFormats}
              onChange={handleFileSelect}
              multiple
            />
            <Tooltip text={t('photo-gallery-upload-formats')}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !canWrite}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('photo-gallery-upload')}
              </Button>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setCarouselOpen(true)}
              disabled={photos.length === 0}
            >
              {t('photo-gallery-view-all')} ({photos.length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Carousel Modal */}
      <Dialog open={carouselOpen} onOpenChange={setCarouselOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {t('photo-gallery-title')} ({photos.length})
            </DialogTitle>
          </DialogHeader>
          <div className="px-16 py-4">
            {photos.length === 0 ? (
              <div className="aspect-video bg-muted/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageOff className="size-12 opacity-30" />
                <p className="text-sm">{t('photo-gallery-empty')}</p>
              </div>
            ) : (
              <Carousel className="w-full">
                <CarouselContent>
                  {photos.map((photo) => (
                    <CarouselItem key={photo.id}>
                      <div className="relative">
                        <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden">
                          <img
                            src={photo.url}
                            alt={`${t('photo-gallery-title')} ${photo.id}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        {/* Default badge */}
                        {photo.isDefault && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="size-3 fill-current" />
                            {t('photo-gallery-default-badge')}
                          </div>
                        )}

                        {/* Actions menu */}
                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canWrite}
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!photo.isDefault && (
                                <DropdownMenuItem
                                  onClick={() => onSetDefault(photo)}
                                  disabled={isSettingDefault}
                                >
                                  <Star className="size-4 mr-2" />
                                  {t('photo-gallery-set-default')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(photo)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" />
                                {t('photo-gallery-delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('photo-gallery-delete-title')}</DialogTitle>
            <DialogDescription>{t('photo-gallery-delete-confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('photo-gallery-cancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              {t('photo-gallery-delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

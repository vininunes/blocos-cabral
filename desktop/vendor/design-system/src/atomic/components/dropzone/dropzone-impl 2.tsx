import { ReactNode, useCallback, useEffect } from 'react'

import { FileDropItem } from 'react-aria-components'

import { BaseDropZone } from '@/atomic/base-components/base-dropzone'

import { cn } from '@/lib/tailwind/utils'

/** Extensão em minúsculas com ponto (".png"), ou '' quando o nome não tem. */
function extensionOf(fileName: string): string {
  const at = fileName.lastIndexOf('.')
  return at > 0 ? fileName.slice(at).toLowerCase() : ''
}

/** Extensão a partir do MIME (arquivos colados costumam vir só com o tipo). */
function extensionFromMime(type: string): string {
  const subtype = type.split('/')[1]?.toLowerCase()
  if (!subtype) return ''
  if (subtype === 'jpeg') return '.jpg'
  if (subtype === 'svg+xml') return '.svg'
  return `.${subtype}`
}

export function Dropzone({
  onChange,
  onError,
  acceptFormats,
  dragDropDisabled = false,
  selectFileDisabled = false,
  enablePaste = false,
  className,
  children,
}: {
  dragDropDisabled?: boolean
  selectFileDisabled?: boolean
  acceptFormats: string[]
  onChange: (files: File[]) => void
  /**
   * Aceita arquivos colados (Ctrl+V) em qualquer ponto da página enquanto o
   * dropzone estiver montado — ex.: imagem copiada de um print. Arquivos sem
   * nome ganham um nome com a extensão derivada do MIME.
   */
  enablePaste?: boolean

  onError?: (error: unknown) => void
  className?: string
  children?: ReactNode
}) {
  const accepts = useCallback(
    (file: File) => {
      const ext = extensionOf(file.name) || extensionFromMime(file.type)
      return ext !== '' && acceptFormats.map((f) => f.toLowerCase()).includes(ext)
    },
    [acceptFormats]
  )

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      try {
        onChange(files)
      } catch (error) {
        if (onError) onError(error)
      }
    },
    [onChange, onError]
  )

  const handleDrop = useCallback(
    async (items: FileDropItem[]) => {
      try {
        const files: File[] = []

        for (const item of items) {
          const file = await item.getFile()

          files.push(file)
        }

        // Extensão pelo último ponto: "relatório.final.pdf" também passa.
        handleFiles(files.filter(accepts))
      } catch (error) {
        if (onError) onError(error)
      }
    },
    [accepts, handleFiles, onError]
  )

  // Ctrl+V: arquivos do clipboard (imagens coladas chegam como "image.png").
  useEffect(() => {
    if (!enablePaste || dragDropDisabled) return

    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? [])
      const files: File[] = []
      for (const item of items) {
        if (item.kind !== 'file') continue
        const file = item.getAsFile()
        if (!file) continue
        const ext = extensionOf(file.name) || extensionFromMime(file.type)
        const named =
          extensionOf(file.name) === ''
            ? new File([file], `pasted-${Date.now()}${ext}`, { type: file.type })
            : file
        if (accepts(named)) files.push(named)
      }
      if (files.length === 0) return
      event.preventDefault()
      handleFiles(files)
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [enablePaste, dragDropDisabled, accepts, handleFiles])

  return (
    <BaseDropZone
      className={cn(className)}
      onDrop={({ items }) => handleDrop(items as FileDropItem[])}
      isDisabled={dragDropDisabled}
    >
      <input
        type="file"
        multiple
        accept={acceptFormats.toString()}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(Array.from(e.target.files))
          }
        }}
        disabled={selectFileDisabled}
      />
      <div className="w-full h-full">{children}</div>
    </BaseDropZone>
  )
}

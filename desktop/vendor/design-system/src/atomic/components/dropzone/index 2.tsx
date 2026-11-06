import { lazy, ReactNode, Suspense } from 'react'

import { Loading } from '@/atomic/base-components/loading'

const DropzoneImpl = lazy(() =>
  import('./dropzone-impl').then((m) => ({ default: m.Dropzone }))
)

export interface DropzoneProps {
  dragDropDisabled?: boolean
  selectFileDisabled?: boolean
  acceptFormats: string[]
  onChange: (files: File[]) => void
  onError?: (error: unknown) => void
  className?: string
  children?: ReactNode
  /** Aceita colar arquivos (Ctrl+V) — repassado ao impl. */
  enablePaste?: boolean
}

export function Dropzone(props: DropzoneProps) {
  return (
    <Suspense fallback={<Loading text="" className="h-full w-full" />}>
      <DropzoneImpl {...props} />
    </Suspense>
  )
}

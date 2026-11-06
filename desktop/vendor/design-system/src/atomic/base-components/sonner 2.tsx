import { useAtomValue } from 'jotai'
import { Check, CircleX, Info, Loader, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, ToasterProps } from 'sonner'

import { decreaseGpuUsageState } from '@/atomic/features/settings/store/settings-state'

function Toaster({ ...props }: ToasterProps) {
  // decrease_gpu_usage: toast sólido, sem backdrop-filter.
  const decreaseGpuUsage = useAtomValue(decreaseGpuUsageState)
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: `${decreaseGpuUsage ? '!bg-background-flat' : '!bg-background !backdrop-blur-md'} !outline !outline-offset !outline-foreground/20 !border-none`,
          // O conteúdo ocupa toda a largura restante ao lado do ícone; sem isso
          // conteúdos custom (ex.: barra de progresso) ficam na largura mínima
          // e sobra um vazio à direita do toast.
          content: '!flex-1 !min-w-0',
          title: '!text-neutral',
          description: '!text-neutral/70',
          actionButton: '!bg-primary !rounded-md',
          cancelButton: '!bg-destructive !text-white !rounded-md',
          closeButton: '!bg-gray',
          icon: '!w-6 !h-6 !flex !justify-center !items-center',
        },
      }}
      icons={{
        success: <Check className="size-5" color={'var(--positive)'} />,
        info: <Info className="size-5" color={'var(--primary)'} />,
        warning: <TriangleAlert className="size-5" color={'var(--warning)'} />,
        error: <CircleX className="size-5" color={'var(--destructive)'} />,
        loading: <Loader className="size-5 animate-spin" color={'var(--foreground)'} />,
      }}
      {...props}
    />
  )
}
export { Toaster }

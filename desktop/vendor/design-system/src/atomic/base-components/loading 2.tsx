import { Loader } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

export function Loading({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 p-2', className)}>
      <Loader className="animate-spin" />
      {text && <p>{text}</p>}
    </div>
  )
}

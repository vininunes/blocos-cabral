import { ReactNode } from 'react'

import { ChevronRight } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'

export function SettingsOpenPage({
  onClick,
  icon,
  text,
}: {
  onClick: () => void
  icon?: ReactNode
  text: string
}) {
  return (
    <Button
      variant={'ghost'}
      className="flex items-center w-full flex-1 !p-0 justify-between hover:bg-transparent "
      onClick={onClick}
    >
      <div className="flex gap-2 items-center">
        {icon}
        <p className="text-sm">{text}</p>
      </div>
      <ChevronRight />
    </Button>
  )
}

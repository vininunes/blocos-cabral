import { ReactNode } from 'react'

export function SettingsHandler({
  handler,
  title,
  description,
}: {
  handler: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col">
        <p className="text-sm">{title}</p>
        {description && <p className="text-[10px] text-muted-foreground w-[80%]">{description}</p>}
      </div>

      {handler}
    </div>
  )
}

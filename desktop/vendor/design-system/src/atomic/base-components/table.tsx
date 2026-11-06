import { ReactNode } from 'react'

import { cn } from '@/lib/tailwind/utils'

import { TableBase, TableBody, TableFooter, TableHeader } from './table-base'

type TableProps = {
  className?: string
  caption?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  body?: ReactNode
}

export function Table({ className, header, footer, body }: TableProps) {
  return (
    <TableBase className={cn(className)}>
      {header && <TableHeader>{header}</TableHeader>}
      <TableBody>{body}</TableBody>
      {footer && <TableFooter>{footer}</TableFooter>}
    </TableBase>
  )
}

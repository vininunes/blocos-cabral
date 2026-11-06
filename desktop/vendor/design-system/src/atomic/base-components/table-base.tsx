import * as React from 'react'

import { cn } from '@/lib/tailwind/utils'

import { ScrollArea } from './scroll-area'

function TableBase({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <ScrollArea
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-md border"
      orientation="horizontal"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </ScrollArea>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-background [&_tr]:border-b [&_tr:hover]:bg-transparent', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&>tr:last-child]:border-b-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // Zebrado global: linhas pares levemente mais escuras (preto a 5%).
        // O hover usa a MESMA escala do stripe (preto translúcido, degraus
        // acima) em vez do token muted: muted varia por tema e ora empatava
        // com o stripe (hover invisível na linha zebrada), ora com o card
        // (invisível na ímpar). Preto a 10% substitui os dois fundos, então a
        // cor final do hover é idêntica em qualquer linha, e o zebrado segue
        // visível nas demais.
        'bg-card even:bg-black/5 data-[state=selected]:bg-muted border-b transition-colors hover:bg-black/10',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap select-text [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap select-text [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  )
}

export {
  TableBase,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

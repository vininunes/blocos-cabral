/**
 * Estado ABERTO dos widgets do header (bandeja/dropdown aberta): o card inteiro
 * fica `bg-primary` com ícone branco — substitui a antiga bolinha azul abaixo
 * do widget. O Radix marca o trigger com `data-state="open"`; aplique
 * `widgetOpenCardClass` no FloatCard usado como trigger (que precisa da classe
 * `group`) e `widgetOpenButtonClass` no Button ghost interno, para o hover
 * dele não cobrir o primary com o `bg-muted` do ghost.
 */
export const widgetOpenCardClass = 'data-[state=open]:bg-primary data-[state=open]:text-white'

export const widgetOpenButtonClass =
  'group-data-[state=open]:hover:bg-transparent group-data-[state=open]:hover:text-white'

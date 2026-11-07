import type { ModoComparacao } from '@server/relatorio/api-tipos'

/**
 * Modos de comparação na ordem do select ("Não comparar" primeiro). O valor é o do servidor;
 * o rótulo completa a frase "Comparar com …" e o resumo vai na faixa do período.
 */
export const MODOS_COMPARACAO: { valor: ModoComparacao; rotulo: string; resumo: string }[] = [
  { valor: 'Sem comparação', rotulo: 'Não comparar', resumo: '' },
  {
    valor: 'Até a mesma data',
    rotulo: 'Período anterior, até o mesmo dia',
    resumo: 'até o mesmo dia',
  },
  { valor: 'Período anterior', rotulo: 'Período anterior completo', resumo: 'período completo' },
  {
    valor: 'Mesmo período do ano anterior',
    rotulo: 'Mesmo período do ano passado',
    resumo: 'um ano antes',
  },
  {
    valor: 'Personalizado',
    rotulo: 'Personalizado',
    resumo: 'período escolhido',
  },
]

export const resumoModo = (modo: ModoComparacao) =>
  MODOS_COMPARACAO.find((m) => m.valor === modo)?.resumo ?? ''

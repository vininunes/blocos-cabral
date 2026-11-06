import { atom } from 'jotai'

import type { RelatorioTab } from '../constants/relatorio-tabs'

export const relatorioTabAtom = atom<RelatorioTab>('indicadores')

/** Tela aberta: o relatório ou o banco de dados (importação e tabelas). */
export type Tela = 'relatorio' | 'banco'
export const telaAtom = atom<Tela>('relatorio')

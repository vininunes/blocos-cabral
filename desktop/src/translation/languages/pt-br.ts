import { relatorioDadosTextsPTBR } from '@/atomic/features/relatorio-dados/translation/relatorio-dados-texts'
import { relatorioFiltrosTextsPTBR } from '@/atomic/features/relatorio-filtros/translation/relatorio-filtros-texts'
import { relatorioImportacaoTextsPTBR } from '@/atomic/features/relatorio-importacao/translation/relatorio-importacao-texts'

import { relatorioTextsPTBR } from '@/atomic/modules/relatorio/translation/relatorio-texts'

export const portuguese = {
  translation: {
    // textos usados pelos componentes do design system
    'date-picker-hint': 'dd/mm/aaaa',
    ...relatorioTextsPTBR,
    ...relatorioDadosTextsPTBR,
    ...relatorioFiltrosTextsPTBR,
    ...relatorioImportacaoTextsPTBR,
  },
}

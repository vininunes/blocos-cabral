import type { ProdutoPreco, RetratoPrecos } from '@server/relatorio/api-tipos'
import { fmtData, norm } from '@server/relatorio/utils'

/** Mesma chave do servidor (PontoPreco.codigo): o código ou, sem código, o nome. */
export const chaveProduto = (p: Pick<ProdutoPreco, 'codigo' | 'produto'>) =>
  p.codigo || `nome:${norm(p.produto)}`

/** Nome do produto com a unidade (o mesmo nome existe por peça e por m²). */
export const rotuloProduto = (p: Pick<ProdutoPreco, 'produto' | 'un'>) =>
  p.un ? `${p.produto} (${p.un})` : p.produto

/** '01/11/2026 a 24/11/2026' */
export const rotuloRetrato = (r: Pick<RetratoPrecos, 'de' | 'ate'>) =>
  `${fmtData(r.de)} a ${fmtData(r.ate)}`

/** '01/11 a 24/11/26' (títulos de coluna). */
export const rotuloRetratoCurto = (r: Pick<RetratoPrecos, 'de' | 'ate'>) =>
  `${fmtData(r.de, false)} a ${fmtData(r.ate, false)}/${r.ate.slice(2, 4)}`

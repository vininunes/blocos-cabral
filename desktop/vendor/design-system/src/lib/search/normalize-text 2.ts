/**
 * Normalização canônica de texto para BUSCA em toda a aplicação.
 *
 * Remove diacríticos (decompõe em NFD e descarta as marcas de combinação) e
 * baixa a caixa, de modo que "São Francisco do Sul" case com "sao francisco
 * do sul", "SAO FRANCISCO" e "São francisco".
 *
 * Só normaliza a COMPARAÇÃO — nunca use o retorno para exibir, persistir ou
 * enviar à API. É a primitiva única de match: quem escolhe QUAIS campos entram
 * na busca é cada superfície (ver `createSearchFilter` em `@/lib/list`).
 */
export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * `true` quando `haystack` contém `normalizedQuery` — insensível a acento e
 * caixa. O termo já deve vir normalizado (normalize uma vez, compare N vezes).
 */
export function matchesNormalized(
  haystack: string | number | null | undefined,
  normalizedQuery: string
): boolean {
  if (haystack == null) return false
  return normalizeSearchText(String(haystack)).includes(normalizedQuery)
}

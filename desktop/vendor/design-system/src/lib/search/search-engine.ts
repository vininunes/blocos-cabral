import MiniSearch from 'minisearch'
import type MiniSearchType from 'minisearch'

import { normalizeSearchText } from './normalize-text'
import type { BaseDoc } from './serach-types'

/** @deprecated use `normalizeSearchText` — mantido como alias do índice MiniSearch. */
export const miniSearchNormalize = normalizeSearchText

const miniSearchTokenize = (s: string) =>
  miniSearchNormalize(s)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)

function miniSearchOptions<T extends BaseDoc>(cfg: {
  fields: (keyof T & string)[]
  storeFields?: (keyof T & string)[]
}) {
  return {
    fields: cfg.fields as string[],
    storeFields: (cfg.storeFields ?? []) as string[],
    tokenize: miniSearchTokenize,
    processTerm: miniSearchNormalize,
    searchOptions: { combineWith: 'AND' as const },
  }
}

export function createMiniSearch<T extends BaseDoc>(cfg: {
  fields: (keyof T & string)[]
  storeFields?: (keyof T & string)[]
}) {
  return new MiniSearch<T>(miniSearchOptions<T>(cfg))
}

type MiniSearchJSON<T extends BaseDoc> = ReturnType<MiniSearchType<T>['toJSON']>

export const miniSearchSerialize = <T extends BaseDoc>(idx: MiniSearch<T>) => idx.toJSON()

export function load<T extends BaseDoc>(
  json: string | MiniSearchJSON<T>,
  cfg: { fields: (keyof T & string)[]; storeFields?: (keyof T & string)[] }
) {
  const jsonStr = typeof json === 'string' ? json : JSON.stringify(json)
  return MiniSearch.loadJSON<T>(jsonStr, miniSearchOptions<T>(cfg))
}

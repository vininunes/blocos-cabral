import type MiniSearch from 'minisearch'

import { registerContext } from '@/lib/search'
import { SearchDoc } from '@/lib/search/search-doc'
import { createMiniSearch, miniSearchNormalize } from '@/lib/search/search-engine'

export type Filters = {
  category?: string
}

registerContext<SearchDoc, MiniSearch<SearchDoc>, Filters>('settings', {
  build: (docs) => {
    const idx = createMiniSearch<SearchDoc>({
      fields: ['title', 'aliases', 'keywords', 'category', 'description'],
      storeFields: ['id', 'title', 'category', 'description', 'path', 'aliases'],
    })

    idx.addAll(docs.map((d) => ({ ...d, keywords: d.keywords ?? [] })))
    return idx
  },

  search: (idx, q, f) => {
    const category = f?.category ? miniSearchNormalize(f.category) : undefined
    return idx
      .search(q, {
        prefix: true,
        fuzzy: 0.2,
        boost: {
          title: 5,
          aliases: 3,
          keywords: 2,
          category: 1,
          description: 1,
        },
        filter: (doc) =>
          !category || (doc.category && miniSearchNormalize(doc.category).includes(category)),
      })
      .map((r) => String(r.id))
  },
})

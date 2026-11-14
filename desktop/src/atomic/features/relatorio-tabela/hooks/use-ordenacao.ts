import { useMemo, useRef, useState } from 'react'

export type ValorOrdenavel = string | number | null | undefined
export type Ordem = { coluna: string; dir: 'asc' | 'desc' } | null

const DATA = /^\d{4}-\d{2}-\d{2}/
const colador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Números e datas começam do maior; texto de A a Z (como a tabela padrão do relatório). */
const comecaDesc = (v: ValorOrdenavel) =>
  typeof v === 'number' || (typeof v === 'string' && DATA.test(v))

function comparar(x: ValorOrdenavel, y: ValorOrdenavel) {
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return colador.compare(String(x), String(y))
}

const vazio = (v: ValorOrdenavel) => v === null || v === undefined || v === ''

/** Cópia ordenada (estável) pelo valor de `f`; vazios sempre no fim, nos dois sentidos. */
export function ordenarPor<T>(
  dados: readonly T[],
  f: (item: T) => ValorOrdenavel,
  dir: 'asc' | 'desc'
): T[] {
  const sinal = dir === 'asc' ? 1 : -1
  return dados
    .map((item, i) => ({ item, i, v: f(item) }))
    .sort((a, b) => {
      const va = vazio(a.v),
        vb = vazio(b.v)
      if (va || vb) return va === vb ? a.i - b.i : va ? 1 : -1
      return sinal * comparar(a.v, b.v) || a.i - b.i
    })
    .map((x) => x.item)
}

/** Sentido do 1º clique na coluna, pelo primeiro valor preenchido. */
export const primeiroSentido = (valores: ValorOrdenavel[]): 'asc' | 'desc' =>
  comecaDesc(valores.find((v) => !vazio(v))) ? 'desc' : 'asc'

/**
 * Ordenação por coluna de tabelas feitas à mão: 1º clique ordena (números/datas do maior, texto
 * de A a Z), 2º inverte, 3º volta à ordem original. Vazios sempre no fim.
 */
export function useOrdenacao<T>(
  dados: readonly T[],
  acessores: Record<string, (item: T) => ValorOrdenavel>
) {
  const [ordem, setOrdem] = useState<Ordem>(null)
  // acessores costumam ser recriados a cada render: a ordenação usa sempre os atuais
  const ref = useRef(acessores)
  ref.current = acessores

  const ordenados = useMemo(() => {
    const f = ordem && ref.current[ordem.coluna]
    return !ordem || !f ? dados : ordenarPor(dados, f, ordem.dir)
  }, [dados, ordem])

  const alternar = (coluna: string) => {
    const f = ref.current[coluna]
    const primeiro = primeiroSentido(f ? dados.map(f) : [])
    setOrdem((o) =>
      !o || o.coluna !== coluna
        ? { coluna, dir: primeiro }
        : o.dir === primeiro
          ? { coluna, dir: primeiro === 'asc' ? 'desc' : 'asc' }
          : null
    )
  }

  return { ordenados, ordem, alternar }
}

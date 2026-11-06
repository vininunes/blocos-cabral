/**
 * Leitura de CSV como o `pd.read_csv(sep=..., dtype=str, keep_default_na=False)`:
 * aspas com "" escapado, quebras de linha dentro de aspas e linhas em branco ignoradas.
 */
export function lerCsv(texto: string, sep: string): { colunas: string[]; linhas: string[][] } {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  let i = 0
  const fimLinha = () => {
    linha.push(campo)
    campo = ''
    if (!(linha.length === 1 && linha[0] === '')) linhas.push(linha)
    linha = []
  }
  while (i < texto.length) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i += 2
          continue
        }
        aspas = false
      } else {
        campo += c
      }
      i++
      continue
    }
    if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\r') {
      if (texto[i + 1] !== '\n') fimLinha()
    } else if (c === '\n') fimLinha()
    else campo += c
    i++
  }
  if (campo !== '' || linha.length) fimLinha()
  const [colunas = [], ...resto] = linhas
  return { colunas, linhas: resto.map((l) => colunas.map((_, j) => l[j] ?? '')) }
}

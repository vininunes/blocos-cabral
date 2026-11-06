/** Extensão do arquivo em minúsculas ("pdf"), ou string vazia quando não há. */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : ''
}

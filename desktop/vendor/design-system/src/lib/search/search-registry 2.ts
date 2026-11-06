/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseDoc, ContextDef } from './serach-types'

const registry = new Map<string, ContextDef<any, any, any>>()

export function registerContext<T extends BaseDoc, I, F = any>(
  key: string,
  def: ContextDef<T, I, F>
) {
  registry.set(key, def)
}

export function getContext(key: string) {
  const def = registry.get(key)
  if (!def) throw new Error(`Search context "${key}" not registry`)
  return def
}

// utilitários opcionais
export function hasContext(key: string) {
  return registry.has(key)
}
export function clearRegistry() {
  registry.clear()
}

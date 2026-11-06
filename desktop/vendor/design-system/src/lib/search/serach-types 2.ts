/* eslint-disable @typescript-eslint/no-explicit-any */
export type BaseDoc = { id: string }

export type BuildFn<T extends BaseDoc, I> = (docs: T[]) => I
export type SearchFn<I, F = any> = (index: I, query: string, filters?: F) => string[]

export type ContextDef<T extends BaseDoc = any, I = any, F = any> = {
  build: BuildFn<T, I>
  search: SearchFn<I, F>
}

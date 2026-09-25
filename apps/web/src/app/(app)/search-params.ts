/** A Next.js search-param value: absent, single, or repeated. */
export type SearchParam = string | string[] | undefined

/** The first value of a search param, or `undefined` when it is absent. */
export function firstParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Returns `value` only when it is a same-origin path; otherwise `fallback`. Blocks `//host` and `/\host`. */
export function safeReturnTo(value: string | undefined, fallback: string): string {
  return value !== undefined && /^\/(?![/\\])/.test(value) ? value : fallback
}

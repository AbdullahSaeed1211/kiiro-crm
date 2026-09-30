/** The value, or a clear error when a lookup that must succeed did not. */
export function need<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null) throw new Error(`demo data is missing ${what}`)
  return value
}

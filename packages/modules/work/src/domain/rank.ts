const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

function digit(value: string | undefined, fallback: number): number {
  const index = value === undefined ? -1 : ALPHABET.indexOf(value)
  return index < 0 ? fallback : index
}

function boundary(value: string | undefined, position: number, missing: number): number {
  if (value === undefined) return missing
  return digit(value[position], 0)
}

/** Returns a lexicographically sortable rank between two ranks when space exists. */
export function rankBetween(before?: string, after?: string): string {
  let prefix = ''
  for (let position = 0; position < 128; position += 1) {
    const low = boundary(before, position, -1)
    const high = boundary(after, position, 36)
    if (high - low > 1) {
      const middle = ALPHABET[Math.floor((low + high) / 2)] ?? 'h'
      return prefix + middle
    }
    prefix += ALPHABET[Math.max(0, low)] ?? '0'
  }
  return `${before ?? ''}h`
}

/** Reassigns evenly spaced ranks, preserving the supplied order. */
export function rebalanceRanks(ids: readonly string[]): ReadonlyMap<string, string> {
  return new Map(ids.map((id, index) => [id, String(index + 1).padStart(12, '0')]))
}

/** Orders tasks by rank, then id, which makes duplicate ranks deterministic. */
export function orderByRank<T extends { readonly id: string; readonly rank?: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.rank ?? '').localeCompare(b.rank ?? '') || a.id.localeCompare(b.id))
}

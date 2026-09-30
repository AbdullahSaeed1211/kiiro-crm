import { need } from './need'

/** A small seeded random source, so the demo dataset is identical on every run. */
export interface Random {
  /** A float in [0, 1). */
  next(): number
  /** An integer in [min, max]. */
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  /** True with probability `chance`. */
  chance(chance: number): boolean
  /** Picks by relative weight, for example `[['New', 3], ['Won', 1]]`. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T
}

/** Mulberry32: a 32-bit generator that is fast and good enough for sample data. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => need(items[int(0, items.length - 1)], 'an item to pick')
  const chance = (probability: number): boolean => next() < probability
  const weighted = <T>(entries: readonly (readonly [T, number])[]): T => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
    let remaining = next() * total
    for (const [value, weight] of entries) {
      remaining -= weight
      if (remaining < 0) return value
    }
    return need(entries.at(-1), 'a weighted choice')[0]
  }
  return { next, int, pick, chance, weighted }
}

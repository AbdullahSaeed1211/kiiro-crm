/** How every percentile in the output files is computed. */
export const PERCENTILE_METHOD =
  'nearest-rank: the value at rank ceil(p * n / 100), at least 1, of the ascending samples; median is p50'

/** Count, min, p50, p95 and max of one sample set. */
export interface Summary {
  readonly count: number
  readonly min: number
  readonly p50: number
  readonly p95: number
  readonly max: number
}

/** Nearest-rank percentile of `values` for `p` in [0, 100]; throws on an empty sample set. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new RangeError('percentile of an empty sample set')
  if (!(p >= 0 && p <= 100)) throw new RangeError(`percentile must be within [0, 100], got ${String(p)}`)
  const sorted = [...values].sort((a, b) => a - b)
  // Integer arithmetic first: (p / 100) * n can land just above a whole rank, e.g. 0.95 * 20.
  const rank = Math.max(1, Math.ceil((p * sorted.length) / 100))
  return sorted[rank - 1] ?? Number.NaN
}

/** Summarises a non-empty sample set with {@link percentile}. */
export function summarize(values: readonly number[]): Summary {
  return {
    count: values.length,
    min: percentile(values, 0),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    max: percentile(values, 100),
  }
}

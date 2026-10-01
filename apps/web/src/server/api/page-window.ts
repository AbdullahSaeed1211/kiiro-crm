import { domainError, err, ok, type Result } from '@ops/kernel'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

/** Which page of a list was asked for. */
export interface PageWindow {
  readonly page: number
  readonly limit: number
}

interface Bounds {
  readonly name: string
  readonly min: number
  readonly max: number
}

function wholeNumber(raw: string | null, bounds: Bounds): Result<number | undefined> {
  if (raw === null || raw === '') return ok(undefined)
  const value = Number(raw)
  return Number.isInteger(value) && value >= bounds.min && value <= bounds.max
    ? ok(value)
    : err(
        domainError(
          'VALIDATION',
          `${bounds.name} must be a whole number from ${String(bounds.min)} to ${String(bounds.max)}.`,
        ),
      )
}

/** `?page=` (from 1) and `?limit=` (1 to 100, 50 by default); a value that is not a number in range is refused. */
export function pageWindowOf(url: URL): Result<PageWindow> {
  const page = wholeNumber(url.searchParams.get('page'), { name: 'page', min: 1, max: 1_000_000 })
  if (!page.ok) return page
  const limit = wholeNumber(url.searchParams.get('limit'), { name: 'limit', min: 1, max: MAX_LIMIT })
  if (!limit.ok) return limit
  return ok({ page: page.value ?? 1, limit: limit.value ?? DEFAULT_LIMIT })
}

/** A page of records with the numbers a client needs to ask for the next one. */
export interface PageOf<T> {
  readonly records: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasMore: boolean
}

export function pageOf<T>(found: { records: readonly T[]; total: number }, window: PageWindow): PageOf<T> {
  return {
    records: found.records,
    total: found.total,
    page: window.page,
    pageSize: window.limit,
    hasMore: window.page * window.limit < found.total,
  }
}

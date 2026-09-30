import type { Payload } from 'payload'

/** D1 binds at most 100 variables per statement, and Payload fetches one page's rows by listing their ids. */
export const PAGE_CHUNK = 90

interface FindArgs {
  readonly limit?: number
  readonly page?: number
  readonly pagination?: boolean
  readonly sort?: string | readonly string[]
}

interface FindResult {
  readonly docs: readonly unknown[]
  readonly totalDocs: number
  readonly hasNextPage: boolean
}

type Find = (args: FindArgs) => Promise<FindResult>

/** How many rows the caller asked for: everything for `pagination: false` or `limit: 0`, otherwise the limit. */
function wantedRows(args: FindArgs): number {
  const everything = args.pagination === false || args.limit === 0
  return everything ? Number.POSITIVE_INFINITY : (args.limit ?? 10)
}

/** The caller's sort with `id` last, so rows with equal sort values keep one order from page to page. */
function stableSort(sort: FindArgs['sort']): readonly string[] {
  const given = typeof sort === 'string' ? [sort] : (sort ?? ['-createdAt'])
  return given.includes('id') ? given : [...given, 'id']
}

/** Reads `wanted` rows one chunk at a time, stopping early when a page says there are no more. */
async function readChunks(
  find: Find,
  input: { readonly args: FindArgs; readonly wanted: number },
): Promise<FindResult> {
  const { args, wanted } = input
  const docs: unknown[] = []
  let page = 1
  let last: FindResult | undefined
  while (docs.length < wanted) {
    const limit = Math.min(PAGE_CHUNK, wanted - docs.length)
    last = await find({ ...args, pagination: true, limit, page, sort: stableSort(args.sort) })
    docs.push(...last.docs)
    if (!last.hasNextPage) break
    page += 1
  }
  return { docs, totalDocs: last?.totalDocs ?? docs.length, hasNextPage: false }
}

/**
 * Wraps `payload.find` so a read of everything, or of more than one chunk, runs as several chunked pages and comes back
 * as one result. Reads that fit one chunk pass through untouched, as do paginated reads the caller made on purpose.
 */
export function withPagedFind<F extends Find>(find: F): F {
  const paged = (args: FindArgs): Promise<FindResult> => {
    const wanted = wantedRows(args)
    const explicitPage = args.pagination !== false && args.limit !== 0 && args.page !== undefined
    return wanted <= PAGE_CHUNK || explicitPage ? find(args) : readChunks(find, { args, wanted })
  }
  return paged as F
}

/** Makes every read through this Payload instance safe against the D1 variable limit. */
export function installPagedFind(payload: Payload): void {
  const original = payload.find.bind(payload) as unknown as Find
  Object.defineProperty(payload, 'find', { value: withPagedFind(original), configurable: true, writable: true })
}

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

/** How many chunk reads run at once once the first one has said how many rows there are. */
const PARALLEL_CHUNKS = 6

/**
 * Reads `wanted` rows in chunks. The first chunk says how many rows exist, and the rest are then read several at a
 * time and put back in order, so a long list costs a few round trips rather than one per chunk.
 */
async function readChunks(
  find: Find,
  input: { readonly args: FindArgs; readonly wanted: number },
): Promise<FindResult> {
  const { args, wanted } = input
  const sort = stableSort(args.sort)
  const read = (page: number): Promise<FindResult> => find({ ...args, pagination: true, limit: PAGE_CHUNK, page, sort })
  const first = await read(1)
  const docs: unknown[] = [...first.docs]
  const pages = Math.ceil(Math.min(wanted, first.totalDocs) / PAGE_CHUNK)
  for (let at = 2; at <= pages; at += PARALLEL_CHUNKS) {
    const batch = Array.from({ length: Math.min(PARALLEL_CHUNKS, pages - at + 1) }, (_, offset) => read(at + offset))
    for (const result of await Promise.all(batch)) docs.push(...result.docs)
  }
  return { docs: docs.slice(0, wanted), totalDocs: first.totalDocs, hasNextPage: false }
}

/** The largest page size that is at most one chunk and divides `limit`, so a big page is a whole number of small ones. */
function chunkFor(limit: number): number {
  for (let size = Math.min(PAGE_CHUNK, limit); size > 1; size -= 1) if (limit % size === 0) return size
  return 1
}

/** Reads one big page (`limit` rows, page `page`) as several smaller pages and joins them. */
async function readWindow(
  find: Find,
  args: FindArgs & { readonly limit: number; readonly page: number },
): Promise<FindResult> {
  const size = chunkFor(args.limit)
  const parts = args.limit / size
  const docs: unknown[] = []
  let last: FindResult | undefined
  let first: FindResult | undefined
  for (let part = 0; part < parts; part += 1) {
    last = await find({ ...args, limit: size, page: (args.page - 1) * parts + part + 1, sort: stableSort(args.sort) })
    first ??= last
    docs.push(...last.docs)
    if (!last.hasNextPage) break
  }
  return {
    ...last,
    docs,
    totalDocs: first?.totalDocs ?? docs.length,
    hasNextPage: last?.hasNextPage ?? false,
  }
}

/**
 * Wraps `payload.find` so a read of everything, or of more than one chunk, runs as several chunked pages and comes back
 * as one result. Reads that fit one chunk pass through untouched, as do paginated reads the caller made on purpose.
 */
export function withPagedFind<F extends Find>(find: F): F {
  const paged = (args: FindArgs): Promise<FindResult> => {
    const wanted = wantedRows(args)
    if (wanted <= PAGE_CHUNK) return find(args)
    if (args.pagination !== false && args.limit !== undefined && args.limit > 0 && args.page !== undefined)
      return readWindow(find, { ...args, limit: args.limit, page: args.page })
    return readChunks(find, { args, wanted })
  }
  return paged as F
}

/** Makes every read through this Payload instance safe against the D1 variable limit. */
export function installPagedFind(payload: Payload): void {
  const original = payload.find.bind(payload) as unknown as Find
  Object.defineProperty(payload, 'find', { value: withPagedFind(original), configurable: true, writable: true })
}

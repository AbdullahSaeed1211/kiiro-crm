import type { Where } from 'payload'

const FILTERS: readonly (readonly [query: string, field: string])[] = [
  ['kind', 'kind'],
  ['status', 'status'],
  ['organizationId', 'organization'],
]

/** `?kind=`, `?status=` and `?organizationId=` narrow a billing list. */
export function listFilters(url: URL): Where {
  const clauses: Where[] = FILTERS.flatMap(([query, field]) => {
    const value = url.searchParams.get(query)?.trim() ?? ''
    return value === '' ? [] : [{ [field]: { equals: value } }]
  })
  return clauses.length === 0 ? {} : { and: clauses }
}

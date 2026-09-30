import type { DataTablePaginationState } from './types'

/** Previous and next links for a server-paged list; `href` builds the URL of any page number. */
export function paginationFor({
  page,
  pageSize,
  total,
  href,
}: Readonly<{
  page: number
  pageSize: number
  total: number
  href: (page: number) => string
}>): DataTablePaginationState {
  return {
    page,
    pageSize,
    total,
    ...(page > 1 ? { previousHref: href(page - 1) } : {}),
    ...(page * pageSize < total ? { nextHref: href(page + 1) } : {}),
  }
}

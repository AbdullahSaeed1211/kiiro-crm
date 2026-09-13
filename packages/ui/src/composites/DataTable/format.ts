import type { DataTablePaginationState } from './types'

/** Replaces `{name}` placeholders in `template` with `values`; placeholders without a value stay as written. */
export function formatTemplate(template: string, values: Readonly<Record<string, number>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name]
    return value === undefined ? placeholder : String(value)
  })
}

/** 1-based numbers of the first and last row on the current page, plus the total, for the range label. */
export function pageRange(pagination: DataTablePaginationState): Record<'from' | 'to' | 'total', number> {
  const { page, pageSize, total } = pagination
  const skipped = (page - 1) * pageSize
  // A page past the end (for example a stale `page` link) has no rows, so it reports an empty range.
  if (skipped >= total) return { from: 0, to: 0, total }
  return { from: skipped + 1, to: Math.min(page * pageSize, total), total }
}

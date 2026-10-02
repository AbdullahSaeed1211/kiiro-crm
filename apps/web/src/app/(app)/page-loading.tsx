'use client'

import { TableSkeleton } from '@ops/ui/composites/TableSkeleton'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { PAGE_LOADING_COPY } from '../../i18n/page-loading-copy'

/** The skeleton every signed-in page shows while its data loads, so a click answers at once instead of freezing. */
export function PageLoading() {
  const copy = catalogFor(PAGE_LOADING_COPY, useLocale())
  return (
    <div className="px-4 py-3 md:px-6 md:py-4">
      <div className="mb-4 h-7 w-48 animate-pulse rounded-md bg-muted" aria-hidden />
      <TableSkeleton columns={5} label={copy.loading} />
    </div>
  )
}

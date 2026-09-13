import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { formatTemplate, pageRange } from './format'
import type { DataTableLabels, DataTablePaginationState } from './types'

function PageLink({ href, children }: Readonly<{ href: string | undefined; children: ReactNode }>) {
  if (href === undefined) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    )
  }
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<a href={href} />}>
      {children}
    </Button>
  )
}

type DataTableFooterProps = Readonly<{
  pagination: DataTablePaginationState
  labels: DataTableLabels
  selectedCount: number
}>

/** Selection count or visible row range, plus previous and next page links. */
export function DataTableFooter({ pagination, labels, selectedCount }: DataTableFooterProps) {
  const summary =
    selectedCount > 0
      ? formatTemplate(labels.selected, { count: selectedCount })
      : formatTemplate(labels.range, pageRange(pagination))
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      <span className="tabular-nums" aria-live="polite">
        {summary}
      </span>
      <div className="flex items-center gap-2">
        <PageLink href={pagination.previousHref}>
          <ChevronLeft aria-hidden data-icon="inline-start" />
          {labels.previous}
        </PageLink>
        <PageLink href={pagination.nextHref}>
          {labels.next}
          <ChevronRight aria-hidden data-icon="inline-end" />
        </PageLink>
      </div>
    </div>
  )
}

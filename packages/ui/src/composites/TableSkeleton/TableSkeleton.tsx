import { Skeleton } from '@ops/ui/components/ui/skeleton'

/** Props of {@link TableSkeleton}. */
export type TableSkeletonProps = Readonly<{
  rows?: number
  columns?: number
  /** Screen-reader text announcing that the page is loading. */
  label?: string
}>

// Stable string keys avoid index keys while the placeholder cells carry no identity of their own.
function placeholderKeys(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${String(index)}`)
}

function SkeletonRow({ columnKeys }: Readonly<{ columnKeys: readonly string[] }>) {
  return (
    <div className="flex h-10 items-center gap-4 border-b px-2 last:border-b-0">
      {columnKeys.map((key) => (
        <Skeleton key={key} className="h-4 flex-1" />
      ))}
    </div>
  )
}

/** Loading placeholder matching a list page (spec §17): page header row, toolbar and table rows of h-10. */
export function TableSkeleton({ rows = 10, columns = 6, label }: TableSkeletonProps) {
  const columnKeys = placeholderKeys(columns, 'column-')
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      {label === undefined ? null : <span className="sr-only">{label}</span>}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <SkeletonRow columnKeys={columnKeys} />
        {placeholderKeys(rows, 'row-').map((key) => (
          <SkeletonRow key={key} columnKeys={columnKeys} />
        ))}
      </div>
    </div>
  )
}

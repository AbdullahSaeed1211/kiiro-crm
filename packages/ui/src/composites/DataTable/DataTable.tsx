'use client'

import {
  FlexRender,
  useTable,
  type Header,
  type Row,
  type SortDirection,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useCallback, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ops/ui/components/ui/table'
import { cn } from '@ops/ui/lib/utils'
import { buildColumns, dataTableFeatures, type DataTableFeatures, type DataTableInstance } from './columns'
import { DataTableFooter } from './DataTableFooter'
import { DataTableViewOptions } from './DataTableViewOptions'
import type { DataTableColumn, DataTableLabels, DataTablePaginationState, DataTableRow, DataTableSort } from './types'

/** Props of {@link DataTable}. */
export type DataTableProps = Readonly<{
  columns: readonly DataTableColumn[]
  /** Rows of the current page, already sorted by the server. */
  rows: readonly DataTableRow[]
  pagination: DataTablePaginationState
  sort?: DataTableSort
  labels: DataTableLabels
  /** Rendered in place of the rows when the current page is empty. */
  emptyState?: ReactNode
  /** Enables row selection only when the caller also provides a meaningful bulk action surface. */
  selectable?: boolean
  /** Optional controls placed before the column picker in the view toolbar. */
  toolbarStart?: ReactNode
  /** Optional function to get the navigation href for a row; ignores clicks on interactive elements. */
  className?: string
}>

const NO_SORTING: SortingState = []
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const
const STICKY_HEAD = 'sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--color-border)]'

function ariaSort(sortable: boolean, sorted: false | SortDirection): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortable) return undefined
  return sorted === false ? 'none' : ARIA_SORT[sorted]
}

function SortIcon({ sorted }: Readonly<{ sorted: false | SortDirection }>) {
  if (sorted === 'asc') return <ArrowUp aria-hidden className="size-3.5" />
  if (sorted === 'desc') return <ArrowDown aria-hidden className="size-3.5" />
  return <ChevronsUpDown aria-hidden className="size-3.5 opacity-50" />
}

function HeadCell({ header }: Readonly<{ header: Header<DataTableFeatures, DataTableRow> }>) {
  const meta = header.column.columnDef.meta
  const sorted = header.column.getIsSorted()
  const content = header.isPlaceholder ? null : <FlexRender header={header} />
  const sortHref = meta?.sortHref
  return (
    <TableHead
      aria-sort={ariaSort(sortHref !== undefined, sorted)}
      className={cn(STICKY_HEAD, meta?.numeric === true ? 'text-right' : undefined)}
    >
      {sortHref === undefined ? (
        content
      ) : (
        <Link href={sortHref} prefetch={false} className="inline-flex items-center gap-1 hover:text-foreground">
          {content}
          <SortIcon sorted={sorted} />
        </Link>
      )}
    </TableHead>
  )
}

function isInteractiveElement(element: HTMLElement): boolean {
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']
  if (interactiveTags.includes(element.tagName)) return true
  if (element.getAttribute('role') === 'checkbox') return true
  if (element.closest('[data-row-click="ignore"]')) return true
  if (element.closest('a') || element.closest('button')) return true
  return false
}

function BodyRow({
  row,
  href,
  onNavigate,
}: Readonly<{
  row: Row<DataTableFeatures, DataTableRow>
  href?: string
  onNavigate?: (href: string) => void
}>) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if (href === undefined || onNavigate === undefined) return
      const target = event.target as HTMLElement
      if (isInteractiveElement(target)) return
      onNavigate(href)
    },
    [href, onNavigate],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (href === undefined || onNavigate === undefined) return
      if (event.key === 'Enter') {
        event.preventDefault()
        onNavigate(href)
      }
    },
    [href, onNavigate],
  )

  return (
    <TableRow
      data-state={row.getIsSelected() ? 'selected' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={href !== undefined ? 'cursor-pointer' : undefined}
      tabIndex={href !== undefined ? 0 : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cell.column.columnDef.meta?.numeric === true ? 'h-10 text-right tabular-nums' : 'h-10'}
        >
          <FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  )
}

function Body({
  table,
  emptyState,
  onNavigate,
}: Readonly<{
  table: DataTableInstance
  emptyState: ReactNode
  onNavigate?: (href: string) => void
}>) {
  const rows = table.getRowModel().rows
  if (rows.length > 0) {
    return (
      <TableBody>
        {rows.map((row) => {
          const href = row.original.href
          const rowProps = {
            key: row.id,
            row,
            ...(href !== undefined && { href }),
            ...(onNavigate !== undefined && { onNavigate }),
          } as Readonly<{
            key: string
            row: Row<DataTableFeatures, DataTableRow>
            href?: string
            onNavigate?: (href: string) => void
          }>
          return <BodyRow {...rowProps} />
        })}
      </TableBody>
    )
  }
  return (
    <TableBody>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={table.getVisibleLeafColumns().length} className="whitespace-normal">
          {emptyState}
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

/** Server-paginated table with sortable headers, row selection and column visibility (decision D-14, spec §17.5). */
export function DataTable({
  columns,
  rows,
  pagination,
  sort,
  labels,
  emptyState,
  selectable = false,
  toolbarStart,
  className,
}: DataTableProps) {
  const router = useRouter()
  const columnDefs = useMemo(() => buildColumns({ columns, labels, selectable }), [columns, labels, selectable])
  const sorting = useMemo<SortingState>(
    () => (sort === undefined ? NO_SORTING : [{ id: sort.id, desc: sort.desc }]),
    [sort],
  )
  const table = useTable({
    features: dataTableFeatures,
    columns: columnDefs,
    data: rows,
    getRowId: (row) => row.id,
    // Sorting happens on the server through each column's sortHref; the table only reflects it.
    manualSorting: true,
    state: { sorting },
  })
  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href)
    },
    [router],
  )
  return (
    <div className={cn('ops-data-table flex flex-col gap-2', className)}>
      <div className="ops-data-table-toolbar flex flex-wrap items-center justify-end gap-2">
        {toolbarStart === undefined ? null : <div className="min-w-0 flex-1">{toolbarStart}</div>}
        <DataTableViewOptions table={table} label={labels.columns} />
      </div>
      {/* The vendored table wrapper scrolls on its own; making this wrapper the scroller lets the header stick. */}
      <div
        className="ops-data-table-viewport max-h-[calc(100svh-13rem)] overflow-auto rounded-lg border **:data-[slot=table-container]:overflow-visible"
        tabIndex={0}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <HeadCell key={header.id} header={header} />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <Body table={table} emptyState={emptyState} onNavigate={handleNavigate} />
        </Table>
      </div>
      <DataTableFooter pagination={pagination} labels={labels} selectedCount={table.getSelectedRowIds().length} />
    </div>
  )
}

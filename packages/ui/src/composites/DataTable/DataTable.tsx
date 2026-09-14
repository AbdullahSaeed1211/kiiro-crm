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
import { useMemo, type ReactNode } from 'react'
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
        <a href={sortHref} className="inline-flex items-center gap-1 hover:text-muted-foreground">
          {content}
          <SortIcon sorted={sorted} />
        </a>
      )}
    </TableHead>
  )
}

function BodyRow({ row }: Readonly<{ row: Row<DataTableFeatures, DataTableRow> }>) {
  return (
    <TableRow data-state={row.getIsSelected() ? 'selected' : undefined}>
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

function Body({ table, emptyState }: Readonly<{ table: DataTableInstance; emptyState: ReactNode }>) {
  const rows = table.getRowModel().rows
  if (rows.length > 0) {
    return (
      <TableBody>
        {rows.map((row) => (
          <BodyRow key={row.id} row={row} />
        ))}
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
export function DataTable({ columns, rows, pagination, sort, labels, emptyState, selectable = false }: DataTableProps) {
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
  return (
    <div className="ops-data-table flex flex-col gap-2">
      <div className="ops-data-table-toolbar flex items-center justify-end gap-2">
        <DataTableViewOptions table={table} label={labels.columns} />
      </div>
      {/* The vendored table wrapper scrolls on its own; making this wrapper the scroller lets the header stick. */}
      <div className="ops-data-table-viewport max-h-[calc(100svh-13rem)] overflow-auto rounded-lg border **:data-[slot=table-container]:overflow-visible">
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
          <Body table={table} emptyState={emptyState} />
        </Table>
      </div>
      <DataTableFooter pagination={pagination} labels={labels} selectedCount={table.getSelectedRowIds().length} />
    </div>
  )
}

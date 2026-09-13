import type { ReactNode } from 'react'

/** Column description made of plain data, so server components can declare columns for the client table. */
export type DataTableColumn = Readonly<{
  /** Stable id; also the key of this column's cell in {@link DataTableRow}. */
  id: string
  header: string
  /** Link that applies the next sort order for this column; omit when the column cannot be sorted. */
  sortHref?: string
  /** Right-aligns the column and uses tabular figures. */
  numeric?: boolean
  /** Whether the column is listed in the column visibility menu; defaults to true. */
  hideable?: boolean
}>

/** One row whose cells were already rendered by the caller, keyed by column id. */
export type DataTableRow = Readonly<{
  id: string
  cells: Readonly<Record<string, ReactNode>>
}>

/** Sort applied by the server to the current rows. */
export type DataTableSort = Readonly<{
  id: string
  desc: boolean
}>

/** Server pagination state; the rows passed to the table are the current page. */
export type DataTablePaginationState = Readonly<{
  /** 1-based page number. */
  page: number
  pageSize: number
  total: number
  previousHref?: string
  nextHref?: string
}>

/** Translated strings; `range` takes `{from}`, `{to}` and `{total}`, and `selected` takes `{count}`. */
export type DataTableLabels = Readonly<{
  selectAll: string
  selectRow: string
  columns: string
  previous: string
  next: string
  range: string
  selected: string
}>

import {
  columnVisibilityFeature,
  createColumnHelper,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type ReactTable,
} from '@tanstack/react-table'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import type { DataTableColumn, DataTableLabels, DataTableRow } from './types'

type ColumnMeta = Readonly<{
  label: string
  sortHref: string | undefined
  numeric: boolean
}>

/** Features of every data table: sorting (applied by the server), row selection and column visibility. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnMeta: {} as ColumnMeta,
})

/** Feature set type of {@link dataTableFeatures}. */
export type DataTableFeatures = typeof dataTableFeatures

/** Table instance used by the data table parts. */
export type DataTableInstance = ReactTable<DataTableFeatures, DataTableRow>

type Column = ColumnDef<DataTableFeatures, DataTableRow>

// A prefix that caller column ids are unlikely to use.
const SELECT_COLUMN_ID = '__select'

const helper = createColumnHelper<DataTableFeatures, DataTableRow>()

function selectColumn(labels: DataTableLabels): Column {
  return helper.display({
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label={labels.selectAll}
        checked={table.getIsAllRowsSelected()}
        // v9 reports "some" as true when all rows are selected, so indeterminate needs both checks.
        indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
        onCheckedChange={(checked) => {
          table.toggleAllRowsSelected(checked)
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={labels.selectRow}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => {
          row.toggleSelected(checked)
        }}
      />
    ),
  })
}

function dataColumn(column: DataTableColumn): Column {
  return helper.display({
    id: column.id,
    header: column.header,
    enableSorting: column.sortHref !== undefined,
    enableHiding: column.hideable ?? true,
    meta: { label: column.header, sortHref: column.sortHref, numeric: column.numeric === true },
    cell: ({ row }) => row.original.cells[column.id],
  })
}

/** Builds the TanStack column definitions: a selection column followed by the caller's columns. */
export function buildColumns(columns: readonly DataTableColumn[], labels: DataTableLabels): Column[] {
  return [selectColumn(labels), ...columns.map((column) => dataColumn(column))]
}

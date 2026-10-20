import type { DataTableLabels } from '@ops/ui/composites/DataTable'
import type { Locale } from './locale'

/** The labels every record list shares for selection, columns and paging. */
export const TABLE_LABELS: Readonly<Record<Locale, DataTableLabels>> = {
  en: {
    selectAll: 'Select all',
    selectRow: 'Select row',
    columns: 'Columns',
    previous: 'Previous',
    next: 'Next',
    range: '{from}–{to} of {total}',
    selected: '{count} selected',
  },
  es: {
    selectAll: 'Seleccionar todo',
    selectRow: 'Seleccionar fila',
    columns: 'Columnas',
    previous: 'Anterior',
    next: 'Siguiente',
    range: '{from}–{to} de {total}',
    selected: '{count} seleccionados',
  },
}

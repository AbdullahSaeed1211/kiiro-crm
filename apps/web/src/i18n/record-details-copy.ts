import type { CustomFieldsLabels } from '@ops/ui/composites/CustomFields'
import { catalogFor, type Locale } from './locale'

const RECORD_DETAILS_COPY: Readonly<Record<Locale, CustomFieldsLabels>> = {
  en: {
    title: 'Details',
    edit: 'Edit',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    empty: '—',
    yes: 'Yes',
    no: 'No',
    choose: 'Choose…',
    noDate: 'No date',
    clearDate: 'Clear date',
  },
  es: {
    title: 'Detalles',
    edit: 'Editar',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    empty: '—',
    yes: 'Sí',
    no: 'No',
    choose: 'Elegir…',
    noDate: 'Sin fecha',
    clearDate: 'Quitar fecha',
  },
}

/** Record details card copy for a tenant locale, with an English fallback. */
export function recordDetailsLabels(locale: unknown): CustomFieldsLabels {
  return catalogFor(RECORD_DETAILS_COPY, locale)
}

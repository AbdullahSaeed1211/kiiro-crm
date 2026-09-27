import type { CustomFieldsLabels } from '@ops/ui/composites/CustomFields'
import { catalogFor, type Locale } from './locale'

const CUSTOM_FIELD_COPY: Readonly<Record<Locale, CustomFieldsLabels>> = {
  en: {
    title: 'Custom fields',
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
    title: 'Campos personalizados',
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

/** Custom fields card copy for a tenant locale, with an English fallback. */
export function customFieldLabels(locale: unknown): CustomFieldsLabels {
  return catalogFor(CUSTOM_FIELD_COPY, locale)
}

import type { Locale } from './locale'

export interface FilterChipsCopy {
  readonly group: string
  readonly clearAll: string
  readonly remove: string
  readonly search: string
  readonly stage: string
  readonly owner: string
  readonly source: string
}

/** `{label}` and `{text}` are replaced with the chip text. */
export const FILTER_CHIPS_COPY: Readonly<Record<Locale, FilterChipsCopy>> = {
  en: {
    group: 'Filters in use',
    clearAll: 'Clear all',
    remove: 'Remove filter: {label}',
    search: 'Search: {text}',
    stage: 'Stage: {text}',
    owner: 'Owner: {text}',
    source: 'Source: {text}',
  },
  es: {
    group: 'Filtros en uso',
    clearAll: 'Quitar todos',
    remove: 'Quitar filtro: {label}',
    search: 'Búsqueda: {text}',
    stage: 'Etapa: {text}',
    owner: 'Responsable: {text}',
    source: 'Origen: {text}',
  },
}

export const fill = (template: string, values: Readonly<Record<string, string>>): string =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)

import type { Locale } from './locale'

export interface RecordPickerCopy {
  readonly searchOrganizations: string
  readonly searchContacts: string
  readonly narrow: string
}

export const RECORD_PICKER_COPY: Readonly<Record<Locale, RecordPickerCopy>> = {
  en: {
    searchOrganizations: 'Search organizations',
    searchContacts: 'Search contacts',
    narrow: 'Type to find one',
  },
  es: {
    searchOrganizations: 'Buscar organizaciones',
    searchContacts: 'Buscar contactos',
    narrow: 'Escribe para encontrar uno',
  },
}

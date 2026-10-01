import type { Locale } from './locale'

export interface DealContactsCopy {
  readonly title: string
  readonly none: string
  readonly primary: string
  /** `{name}` is the contact's name. */
  readonly primaryFor: string
  readonly remove: string
  readonly removeFor: string
  readonly pick: string
  readonly add: string
  readonly addContact: string
}

export const DEAL_CONTACTS_COPY: Readonly<Record<Locale, DealContactsCopy>> = {
  en: {
    title: 'Contacts',
    none: 'No contacts on this deal yet.',
    primary: 'Main',
    primaryFor: 'Main contact: {name}',
    remove: 'Remove',
    removeFor: 'Remove {name}',
    pick: 'Choose a contact to add',
    add: 'Add',
    addContact: 'Add a contact',
  },
  es: {
    title: 'Contactos',
    none: 'Esta oportunidad aún no tiene contactos.',
    primary: 'Principal',
    primaryFor: 'Contacto principal: {name}',
    remove: 'Quitar',
    removeFor: 'Quitar a {name}',
    pick: 'Elige un contacto para añadir',
    add: 'Añadir',
    addContact: 'Añadir un contacto',
  },
}

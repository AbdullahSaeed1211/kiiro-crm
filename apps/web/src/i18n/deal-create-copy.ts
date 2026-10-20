import type { Locale } from './locale'

export interface DealCreateCopy {
  readonly trigger: string
  readonly title: string
  readonly description: string
  readonly titleLabel: string
  readonly titlePlaceholder: string
  readonly organization: string
  readonly noOrganization: string
  readonly contact: string
  readonly noContact: string
  /** `{currency}` is the workspace currency code. */
  readonly value: string
  readonly valuePlaceholder: string
  readonly expectedClose: string
  readonly invalidValue: string
  readonly cancel: string
  readonly create: string
  readonly creating: string
}

export const DEAL_CREATE_COPY: Readonly<Record<Locale, DealCreateCopy>> = {
  en: {
    trigger: 'New deal',
    title: 'Create deal',
    description: 'Add an opportunity to the sales pipeline.',
    titleLabel: 'Title',
    titlePlaceholder: 'Website redesign',
    organization: 'Organization',
    noOrganization: 'No organization',
    contact: 'Primary contact',
    noContact: 'No contact',
    value: 'Value ({currency})',
    valuePlaceholder: '12000',
    expectedClose: 'Expected close',
    invalidValue: 'Enter a valid deal value.',
    cancel: 'Cancel',
    create: 'Create deal',
    creating: 'Creating…',
  },
  es: {
    trigger: 'Nueva oportunidad',
    title: 'Crear oportunidad',
    description: 'Agrega una oportunidad al embudo de ventas.',
    titleLabel: 'Título',
    titlePlaceholder: 'Rediseño de sitio web',
    organization: 'Organización',
    noOrganization: 'Sin organización',
    contact: 'Contacto principal',
    noContact: 'Sin contacto',
    value: 'Valor ({currency})',
    valuePlaceholder: '12000',
    expectedClose: 'Cierre previsto',
    invalidValue: 'Ingresa un valor válido.',
    cancel: 'Cancelar',
    create: 'Crear oportunidad',
    creating: 'Creando…',
  },
}

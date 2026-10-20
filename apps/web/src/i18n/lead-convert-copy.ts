import type { Locale } from './locale'

/** Words in the convert-lead dialog and the duplicate-lead notice. */
export interface LeadConvertCopy {
  readonly title: string
  readonly description: string
  readonly cancel: string
  readonly submit: string
  readonly submitting: string
  readonly createNew: string
  readonly useExisting: string
  readonly skip: string
  readonly organization: string
  readonly organizationName: string
  readonly contact: string
  /** `{noun}` is the kind of record being picked. */
  readonly selectNoun: string
  /** `{noun}` is the kind of record being searched. */
  readonly searchNoun: string
  readonly nounOrganization: string
  readonly nounContact: string
  /** `{name}` is the suggested record. */
  readonly possibleMatch: string
  readonly dealTitle: string
  /** `{currency}` is the workspace currency code. */
  readonly dealValue: string
  readonly duplicateTitle: string
  readonly duplicateBody: string
  /** `{count}` is how many more duplicates exist. */
  readonly andMore: string
}

export const LEAD_CONVERT_COPY: Readonly<Record<Locale, LeadConvertCopy>> = {
  en: {
    title: 'Convert lead',
    description: 'Create a contact and deal from this lead. Organization is optional.',
    cancel: 'Cancel',
    submit: 'Convert lead',
    submitting: 'Converting…',
    createNew: 'Create new',
    useExisting: 'Use existing',
    skip: 'Skip',
    organization: 'Organization',
    organizationName: 'Organization name',
    contact: 'Contact',
    selectNoun: 'Select {noun}',
    searchNoun: 'Search {noun}',
    nounOrganization: 'organization',
    nounContact: 'contact',
    possibleMatch: 'Possible match: {name}',
    dealTitle: 'Deal title',
    dealValue: 'Deal value ({currency})',
    duplicateTitle: 'Possible duplicate.',
    duplicateBody: 'Another lead has the same email or phone:',
    andMore: 'and {count} more',
  },
  es: {
    title: 'Convertir prospecto',
    description: 'Crea un contacto y una oportunidad a partir de este prospecto. La organización es opcional.',
    cancel: 'Cancelar',
    submit: 'Convertir prospecto',
    submitting: 'Convirtiendo…',
    createNew: 'Crear nuevo',
    useExisting: 'Usar existente',
    skip: 'Omitir',
    organization: 'Organización',
    organizationName: 'Nombre de la organización',
    contact: 'Contacto',
    selectNoun: 'Elegir {noun}',
    searchNoun: 'Buscar {noun}',
    nounOrganization: 'organización',
    nounContact: 'contacto',
    possibleMatch: 'Posible coincidencia: {name}',
    dealTitle: 'Título de la oportunidad',
    dealValue: 'Valor de la oportunidad ({currency})',
    duplicateTitle: 'Posible duplicado.',
    duplicateBody: 'Otro prospecto tiene el mismo correo o teléfono:',
    andMore: 'y {count} más',
  },
}

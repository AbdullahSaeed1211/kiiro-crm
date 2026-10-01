import type { Locale } from './locale'

export interface LeadFormCopy {
  readonly title: string
  readonly titlePlaceholder: string
  readonly firstName: string
  readonly firstNamePlaceholder: string
  readonly lastName: string
  readonly lastNamePlaceholder: string
  readonly company: string
  readonly companyPlaceholder: string
  readonly email: string
  readonly phone: string
  readonly source: string
  readonly sourcePlaceholder: string
  readonly newSource: string
  readonly newSourcePlaceholder: string
  readonly submit: string
  readonly saving: string
  readonly cancel: string
  readonly required: string
}

export const LEAD_FORM_COPY: Readonly<Record<Locale, LeadFormCopy>> = {
  en: {
    title: 'Title',
    titlePlaceholder: 'e.g. Website redesign inquiry',
    firstName: 'First name',
    firstNamePlaceholder: 'e.g. Jane',
    lastName: 'Last name',
    lastNamePlaceholder: 'e.g. Doe',
    company: 'Company',
    companyPlaceholder: 'e.g. Acme Inc.',
    email: 'Email',
    phone: 'Phone',
    source: 'Source',
    sourcePlaceholder: 'Choose a source',
    newSource: 'Or add a new source',
    newSourcePlaceholder: 'e.g. Trade show (owners and managers only)',
    submit: 'Create lead',
    saving: 'Creating…',
    cancel: 'Cancel',
    required: 'This field is required',
  },
  es: {
    title: 'Título',
    titlePlaceholder: 'p. ej. Consulta de rediseño web',
    firstName: 'Nombre',
    firstNamePlaceholder: 'p. ej. Ana',
    lastName: 'Apellido',
    lastNamePlaceholder: 'p. ej. Pérez',
    company: 'Empresa',
    companyPlaceholder: 'p. ej. Acme S.A.',
    email: 'Correo',
    phone: 'Teléfono',
    source: 'Origen',
    sourcePlaceholder: 'Elige un origen',
    newSource: 'O añade un origen nuevo',
    newSourcePlaceholder: 'p. ej. Feria (solo propietarios y gerentes)',
    submit: 'Crear prospecto',
    saving: 'Creando…',
    cancel: 'Cancelar',
    required: 'Este campo es obligatorio',
  },
}

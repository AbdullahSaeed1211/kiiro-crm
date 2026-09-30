import type { Locale } from './locale'

export interface QuickCreateCopy {
  readonly leadTitle: string
  readonly leadDescription: string
  readonly leadFieldTitle: string
  readonly leadFieldFirstName: string
  readonly leadFieldEmail: string
  readonly leadFieldPhone: string
  readonly leadFieldCompany: string
  readonly leadCreate: string
  readonly leadCreating: string

  readonly contactTitle: string
  readonly contactDescription: string
  readonly contactFieldFirstName: string
  readonly contactFieldLastName: string
  readonly contactFieldEmail: string
  readonly contactFieldPhone: string
  readonly contactCreate: string
  readonly contactCreating: string

  readonly organizationTitle: string
  readonly organizationDescription: string
  readonly organizationFieldName: string
  readonly organizationFieldWebsite: string
  readonly organizationFieldEmail: string
  readonly organizationFieldPhone: string
  readonly organizationCreate: string
  readonly organizationCreating: string

  readonly moreFields: string
  readonly cancel: string
  readonly requiredField: string
}

export const QUICK_CREATE_COPY: Readonly<Record<Locale, QuickCreateCopy>> = {
  en: {
    leadTitle: 'Create lead',
    leadDescription: 'Capture a prospect and start working the pipeline.',
    leadFieldTitle: 'Title',
    leadFieldFirstName: 'First name',
    leadFieldEmail: 'Email',
    leadFieldPhone: 'Phone',
    leadFieldCompany: 'Company',
    leadCreate: 'Create lead',
    leadCreating: 'Creating…',

    contactTitle: 'Create contact',
    contactDescription: 'Add a person and connect them to an organization.',
    contactFieldFirstName: 'First name',
    contactFieldLastName: 'Last name',
    contactFieldEmail: 'Email',
    contactFieldPhone: 'Phone',
    contactCreate: 'Create contact',
    contactCreating: 'Creating…',

    organizationTitle: 'Create organization',
    organizationDescription: 'Keep company details and relationships easy for the whole team to trust.',
    organizationFieldName: 'Name',
    organizationFieldWebsite: 'Website',
    organizationFieldEmail: 'Email',
    organizationFieldPhone: 'Phone',
    organizationCreate: 'Create organization',
    organizationCreating: 'Creating…',

    moreFields: 'More fields',
    cancel: 'Cancel',
    requiredField: 'This field is required',
  },
  es: {
    leadTitle: 'Crear oportunidad',
    leadDescription: 'Captura un prospecto e inicia tu flujo de ventas.',
    leadFieldTitle: 'Título',
    leadFieldFirstName: 'Nombre',
    leadFieldEmail: 'Correo electrónico',
    leadFieldPhone: 'Teléfono',
    leadFieldCompany: 'Empresa',
    leadCreate: 'Crear oportunidad',
    leadCreating: 'Creando…',

    contactTitle: 'Crear contacto',
    contactDescription: 'Añade una persona y conéctala a una organización.',
    contactFieldFirstName: 'Nombre',
    contactFieldLastName: 'Apellido',
    contactFieldEmail: 'Correo electrónico',
    contactFieldPhone: 'Teléfono',
    contactCreate: 'Crear contacto',
    contactCreating: 'Creando…',

    organizationTitle: 'Crear organización',
    organizationDescription:
      'Mantén los detalles de la empresa y las relaciones fáciles de confiar para todo el equipo.',
    organizationFieldName: 'Nombre',
    organizationFieldWebsite: 'Sitio web',
    organizationFieldEmail: 'Correo electrónico',
    organizationFieldPhone: 'Teléfono',
    organizationCreate: 'Crear organización',
    organizationCreating: 'Creando…',

    moreFields: 'Más campos',
    cancel: 'Cancelar',
    requiredField: 'Este campo es obligatorio',
  },
}

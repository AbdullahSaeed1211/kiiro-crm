import type { Locale } from './locale'

export interface ActivityLogCopy {
  readonly title: string
  readonly description: string
  readonly person: string
  readonly anyPerson: string
  readonly kind: string
  readonly anyKind: string
  readonly event: string
  readonly anyEvent: string
  readonly from: string
  readonly to: string
  readonly apply: string
  readonly clear: string
  readonly exportCsv: string
  readonly nothing: string
  readonly nothingMatches: string
  readonly system: string
  readonly open: string
  readonly range: string
  readonly previous: string
  readonly next: string
  readonly changesTab: string
  readonly securityTab: string
  readonly securityDescription: string
  readonly nothingSecurity: string
  readonly kinds: Readonly<Record<string, string>>
}

/** `{from}`, `{to}` and `{total}` in `range` are replaced with numbers. */
export const ACTIVITY_LOG_COPY: Readonly<Record<Locale, ActivityLogCopy>> = {
  en: {
    title: 'Activity',
    description: 'Who changed what, with filters. Only owners and managers can see this page.',
    person: 'Person',
    anyPerson: 'Anyone',
    kind: 'Record type',
    anyKind: 'Any type',
    event: 'Event',
    anyEvent: 'Any event',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    clear: 'Clear',
    exportCsv: 'Export CSV',
    nothing: 'Nothing has changed yet.',
    nothingMatches: 'No changes match these filters.',
    system: 'The system',
    open: 'Open {kind}',
    range: '{from}-{to} of {total}',
    previous: 'Previous',
    next: 'Next',
    changesTab: 'Record changes',
    securityTab: 'Security',
    securityDescription:
      'Changes to access, settings and tokens, and data downloads. Only owners and managers can see this page.',
    nothingSecurity: 'No security events yet.',
    kinds: {
      lead: 'Lead',
      deal: 'Deal',
      contact: 'Contact',
      organization: 'Organization',
      project: 'Project',
      task: 'Task',
    },
  },
  es: {
    title: 'Actividad',
    description: 'Quién cambió qué, con filtros. Solo los propietarios y gerentes ven esta página.',
    person: 'Persona',
    anyPerson: 'Cualquiera',
    kind: 'Tipo de registro',
    anyKind: 'Cualquier tipo',
    event: 'Evento',
    anyEvent: 'Cualquier evento',
    from: 'Desde',
    to: 'Hasta',
    apply: 'Aplicar',
    clear: 'Quitar',
    exportCsv: 'Exportar CSV',
    nothing: 'Todavía no ha cambiado nada.',
    nothingMatches: 'Ningún cambio coincide con estos filtros.',
    system: 'El sistema',
    open: 'Abrir {kind}',
    range: '{from}-{to} de {total}',
    previous: 'Anterior',
    next: 'Siguiente',
    changesTab: 'Cambios en registros',
    securityTab: 'Seguridad',
    securityDescription:
      'Cambios de acceso, ajustes y tokens, y descargas de datos. Solo los propietarios y gerentes ven esta página.',
    nothingSecurity: 'Todavía no hay eventos de seguridad.',
    kinds: {
      lead: 'Prospecto',
      deal: 'Oportunidad',
      contact: 'Contacto',
      organization: 'Organización',
      project: 'Proyecto',
      task: 'Tarea',
    },
  },
}

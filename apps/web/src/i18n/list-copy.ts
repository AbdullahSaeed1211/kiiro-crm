import type { Locale } from './locale'

/** Column headers and small labels on the lead and deal lists. */
export interface ListCopy {
  readonly colTitle: string
  readonly colStage: string
  readonly colOwner: string
  readonly colSource: string
  readonly colEmail: string
  readonly colPhone: string
  readonly colNextAction: string
  readonly colCreated: string
  readonly colValue: string
  readonly colOrganization: string
  readonly colExpectedClose: string
  readonly unassigned: string
  readonly responseOverdue: string
  readonly overdue: string
}

export const LIST_COPY: Readonly<Record<Locale, ListCopy>> = {
  en: {
    colTitle: 'Title',
    colStage: 'Stage',
    colOwner: 'Owner',
    colSource: 'Source',
    colEmail: 'Email',
    colPhone: 'Phone',
    colNextAction: 'Next action',
    colCreated: 'Created',
    colValue: 'Value',
    colOrganization: 'Organization',
    colExpectedClose: 'Expected close',
    unassigned: 'Unassigned',
    responseOverdue: 'Response overdue',
    overdue: 'Overdue',
  },
  es: {
    colTitle: 'Título',
    colStage: 'Etapa',
    colOwner: 'Responsable',
    colSource: 'Origen',
    colEmail: 'Correo',
    colPhone: 'Teléfono',
    colNextAction: 'Próxima acción',
    colCreated: 'Creado',
    colValue: 'Valor',
    colOrganization: 'Organización',
    colExpectedClose: 'Cierre previsto',
    unassigned: 'Sin asignar',
    responseOverdue: 'Respuesta vencida',
    overdue: 'Vencida',
  },
}

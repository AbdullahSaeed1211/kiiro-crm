import type { Locale } from './locale'

export interface OrganizationOverviewCopy {
  readonly nextDueItem: string
  readonly responsiblePerson: string
  readonly overdueWork: string
  readonly awaitingClientResponse: string
  readonly noDueItems: string
  readonly noResponsiblePerson: string
  readonly noOverdueWork: string
  readonly noPendingResponses: string
  readonly taskUnit: string
  readonly deliverableUnit: string
}

export const ORGANIZATION_OVERVIEW_COPY: Readonly<Record<Locale, OrganizationOverviewCopy>> = {
  en: {
    nextDueItem: 'Next due item',
    responsiblePerson: 'Responsible person',
    overdueWork: 'Overdue work',
    awaitingClientResponse: 'Awaiting client response',
    noDueItems: 'No dated open work',
    noResponsiblePerson: 'No responsible person assigned',
    noOverdueWork: 'No overdue work',
    noPendingResponses: 'No items awaiting a response',
    taskUnit: 'tasks',
    deliverableUnit: 'deliverables',
  },
  es: {
    nextDueItem: 'Próximo elemento pendiente',
    responsiblePerson: 'Persona responsable',
    overdueWork: 'Trabajo atrasado',
    awaitingClientResponse: 'Pendiente de respuesta del cliente',
    noDueItems: 'No hay trabajo abierto con fecha',
    noResponsiblePerson: 'No hay una persona responsable asignada',
    noOverdueWork: 'No hay trabajo atrasado',
    noPendingResponses: 'No hay elementos pendientes de respuesta',
    taskUnit: 'tareas',
    deliverableUnit: 'entregables',
  },
}

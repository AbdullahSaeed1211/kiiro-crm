import type { Locale } from './locale'

export interface DealRecordCopy {
  readonly breadcrumb: string
  readonly saveTitle: string
  readonly cancelTitle: string
  readonly detailsTitle: string
  readonly controlsTitle: string
  readonly created: string
  readonly closed: string
  readonly owner: string
  readonly unassigned: string
  readonly organization: string
}

export const DEAL_RECORD_COPY: Readonly<Record<Locale, DealRecordCopy>> = {
  en: {
    breadcrumb: 'Deal',
    saveTitle: 'Save title',
    cancelTitle: 'Cancel',
    detailsTitle: 'Deal details',
    controlsTitle: 'Controls',
    created: 'Created',
    closed: 'Closed',
    owner: 'Owner',
    unassigned: 'Unassigned',
    organization: 'Organization',
  },
  es: {
    breadcrumb: 'Oportunidad',
    saveTitle: 'Guardar título',
    cancelTitle: 'Cancelar',
    detailsTitle: 'Detalles de la oportunidad',
    controlsTitle: 'Controles',
    created: 'Creada',
    closed: 'Cerrada',
    owner: 'Responsable',
    unassigned: 'Sin asignar',
    organization: 'Organización',
  },
}

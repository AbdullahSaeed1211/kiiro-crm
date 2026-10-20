import type { Locale } from './locale'

export interface LeadFollowUpsCopy {
  readonly title: string
  readonly overdue: string
  readonly today: string
  readonly next7Days: string
  readonly later: string
  readonly noNextAction: string
  readonly noCompany: string
  readonly unassigned: string
  readonly nextAction: string
  readonly setNextAction: string
  readonly clear: string
  readonly showEveryone: string
  readonly onlyMine: string
  readonly emptyTitle: string
  readonly emptyDescription: string
  readonly previousPage: string
  readonly nextPage: string
  readonly pageSummary: (page: number, pages: number) => string
}

export const LEAD_FOLLOW_UPS_COPY: Readonly<Record<Locale, LeadFollowUpsCopy>> = {
  en: {
    title: 'Follow-ups',
    overdue: 'Overdue',
    today: 'Today',
    next7Days: 'Next 7 days',
    later: 'Later',
    noNextAction: 'No next action set',
    noCompany: 'No company',
    unassigned: 'Unassigned',
    nextAction: 'Next action',
    setNextAction: 'Set next action date',
    clear: 'Clear',
    showEveryone: 'Show everyone’s leads',
    onlyMine: 'Only my leads',
    emptyTitle: 'No open leads',
    emptyDescription: 'New leads will appear here with their next action.',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageSummary: (page, pages) => `Page ${String(page)} of ${String(pages)}`,
  },
  es: {
    title: 'Seguimientos',
    overdue: 'Vencidos',
    today: 'Hoy',
    next7Days: 'Próximos 7 días',
    later: 'Más adelante',
    noNextAction: 'Sin próxima acción',
    noCompany: 'Sin empresa',
    unassigned: 'Sin asignar',
    nextAction: 'Próxima acción',
    setNextAction: 'Fijar fecha de próxima acción',
    clear: 'Limpiar',
    showEveryone: 'Mostrar prospectos de todos',
    onlyMine: 'Solo mis prospectos',
    emptyTitle: 'No hay prospectos abiertos',
    emptyDescription: 'Los prospectos nuevos aparecerán aquí con su próxima acción.',
    previousPage: 'Anterior',
    nextPage: 'Siguiente',
    pageSummary: (page, pages) => `Página ${String(page)} de ${String(pages)}`,
  },
}

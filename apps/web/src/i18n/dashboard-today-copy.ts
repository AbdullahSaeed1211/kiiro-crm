import type { Locale } from './locale'

export interface DashboardTodayCopy {
  readonly title: string
  readonly viewAll: string
  readonly overdue: string
  readonly today: string
  readonly noReply: string
  readonly emptyTitle: string
  readonly emptyBody: string
  readonly more: string
}

export const DASHBOARD_TODAY_COPY: Readonly<Record<Locale, DashboardTodayCopy>> = {
  en: {
    title: 'Leads to follow up today',
    viewAll: 'See all follow-ups',
    overdue: 'Late',
    today: 'Today',
    noReply: 'Needs a reply',
    emptyTitle: 'No follow-ups due',
    emptyBody: 'Your leads have no late or due actions.',
    more: '{count} more',
  },
  es: {
    title: 'Clientes potenciales por seguir hoy',
    viewAll: 'Ver todos los seguimientos',
    overdue: 'Atrasado',
    today: 'Hoy',
    noReply: 'Necesita respuesta',
    emptyTitle: 'No hay seguimientos pendientes',
    emptyBody: 'Tus clientes potenciales no tienen acciones atrasadas ni para hoy.',
    more: '{count} más',
  },
}

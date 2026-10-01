import type { Locale } from './locale'

export interface MyTasksCopy {
  readonly title: string
  readonly description: string
  readonly overdue: string
  readonly today: string
  readonly next7Days: string
  readonly later: string
  readonly noDueDate: string
  readonly team: string
  readonly teamHelp: string
  readonly emptyTitle: string
  readonly emptyDescription: string
}

export const MY_TASKS_COPY: Readonly<Record<Locale, MyTasksCopy>> = {
  en: {
    title: 'My tasks',
    description: 'Open work assigned to you.',
    overdue: 'Overdue',
    today: 'Today',
    next7Days: 'Next 7 days',
    later: 'Later',
    noDueDate: 'No due date',
    team: 'Open for your team',
    teamHelp: 'Nobody has taken these yet. Open one and add yourself.',
    emptyTitle: 'Nothing assigned to you',
    emptyDescription: 'New work assigned to you will appear here.',
  },
  es: {
    title: 'Mis tareas',
    description: 'Trabajo abierto asignado a ti.',
    overdue: 'Vencidas',
    today: 'Hoy',
    next7Days: 'Próximos 7 días',
    later: 'Más adelante',
    noDueDate: 'Sin fecha',
    team: 'Abiertas para tu equipo',
    teamHelp: 'Nadie las ha tomado aún. Abre una y asígnatela.',
    emptyTitle: 'No tienes nada asignado',
    emptyDescription: 'El trabajo nuevo que te asignen aparecerá aquí.',
  },
}

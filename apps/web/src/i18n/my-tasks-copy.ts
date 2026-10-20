import type { Locale } from './locale'

export interface MyTasksCopy {
  readonly title: string
  readonly description: string
  readonly overdue: string
  readonly today: string
  readonly next7Days: string
  readonly later: string
  readonly noDueDate: string
  /** Shown on an overdue repeating task; `{count}` is how many periods went by. */
  readonly missedPeriods: string
  readonly groupBy: string
  readonly byDate: string
  readonly byClient: string
  readonly noProject: string
  readonly team: string
  readonly teamHelp: string
  readonly emptyTitle: string
  readonly emptyDescription: string
  readonly completeTask: string
  readonly completeFailed: string
  /** Toast after ticking a task off; `{title}` is the task. */
  readonly completed: string
  readonly undo: string
  readonly undoFailed: string
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
    missedPeriods: '{count} periods missed',
    groupBy: 'Group by',
    byDate: 'Due date',
    byClient: 'Client',
    noProject: 'No project',
    team: 'Open for your team',
    teamHelp: 'Nobody has taken these yet. Open one and add yourself.',
    emptyTitle: 'Nothing assigned to you',
    emptyDescription: 'New work assigned to you will appear here.',
    completeTask: 'Complete task',
    completeFailed: 'The task was not completed. Refresh and try again.',
    completed: 'Completed “{title}”',
    undo: 'Undo',
    undoFailed: 'The task could not be reopened. Refresh and try again.',
  },
  es: {
    title: 'Mis tareas',
    description: 'Trabajo abierto asignado a ti.',
    overdue: 'Vencidas',
    today: 'Hoy',
    next7Days: 'Próximos 7 días',
    later: 'Más adelante',
    noDueDate: 'Sin fecha',
    missedPeriods: '{count} periodos sin hacer',
    groupBy: 'Agrupar por',
    byDate: 'Fecha',
    byClient: 'Cliente',
    noProject: 'Sin proyecto',
    team: 'Abiertas para tu equipo',
    teamHelp: 'Nadie las ha tomado aún. Abre una y asígnatela.',
    emptyTitle: 'No tienes nada asignado',
    emptyDescription: 'El trabajo nuevo que te asignen aparecerá aquí.',
    completeTask: 'Completar tarea',
    completeFailed: 'No se completó la tarea. Actualiza e inténtalo de nuevo.',
    completed: 'Completada «{title}»',
    undo: 'Deshacer',
    undoFailed: 'No se pudo reabrir la tarea. Actualiza e inténtalo de nuevo.',
  },
}

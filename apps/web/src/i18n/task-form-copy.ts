import { catalogFor, type Locale } from './locale'

/** Copy for the new-task form. */
export interface TaskFormLabels {
  readonly title: string
  readonly project: string
  readonly noProject: string
  readonly priority: string
  readonly priorityNone: string
  readonly priorityLow: string
  readonly priorityMedium: string
  readonly priorityHigh: string
  readonly priorityUrgent: string
  readonly dueDate: string
  readonly repeats: string
  readonly repeatNone: string
  readonly repeatDaily: string
  readonly repeatWeekly: string
  readonly repeatBiweekly: string
  readonly repeatMonthly: string
  readonly repeatQuarterly: string
  readonly repeatYearly: string
  readonly repeatHelp: string
  readonly ownerOnly: string
  readonly description: string
  /** `{name}` is the record the task will be linked to. */
  readonly linkedTo: string
  readonly cancel: string
  readonly create: string
  readonly creating: string
  readonly failed: string
}

const TASK_FORM_COPY: Readonly<Record<Locale, TaskFormLabels>> = {
  en: {
    title: 'Task title',
    project: 'Project',
    noProject: 'No project',
    priority: 'Priority',
    priorityNone: 'No priority',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    dueDate: 'Due date',
    repeats: 'Repeats',
    repeatNone: 'Does not repeat',
    repeatDaily: 'Every day',
    repeatWeekly: 'Every week',
    repeatBiweekly: 'Every 2 weeks',
    repeatMonthly: 'Every month',
    repeatQuarterly: 'Every 3 months',
    repeatYearly: 'Every year',
    repeatHelp: 'Needs a due date. Completing it creates the next one.',
    ownerOnly: 'Owner only: hide from staff',
    description: 'Description',
    linkedTo: 'Linked to {name}',
    cancel: 'Cancel',
    create: 'Create task',
    creating: 'Creating…',
    failed: 'The task was not created. Try again.',
  },
  es: {
    title: 'Título de la tarea',
    project: 'Proyecto',
    noProject: 'Sin proyecto',
    priority: 'Prioridad',
    priorityNone: 'Sin prioridad',
    priorityLow: 'Baja',
    priorityMedium: 'Media',
    priorityHigh: 'Alta',
    priorityUrgent: 'Urgente',
    dueDate: 'Fecha límite',
    repeats: 'Se repite',
    repeatNone: 'No se repite',
    repeatDaily: 'Cada día',
    repeatWeekly: 'Cada semana',
    repeatBiweekly: 'Cada 2 semanas',
    repeatMonthly: 'Cada mes',
    repeatQuarterly: 'Cada 3 meses',
    repeatYearly: 'Cada año',
    repeatHelp: 'Necesita fecha límite. Al completarla se crea la siguiente.',
    ownerOnly: 'Solo propietario: ocultar al personal',
    description: 'Descripción',
    linkedTo: 'Vinculada a {name}',
    cancel: 'Cancelar',
    create: 'Crear tarea',
    creating: 'Creando…',
    failed: 'No se creó la tarea. Inténtalo de nuevo.',
  },
}

/** New-task form copy for a tenant locale, with an English fallback. */
export function taskFormLabels(locale: unknown): TaskFormLabels {
  return catalogFor(TASK_FORM_COPY, locale)
}

import type { Locale } from './locale'

export interface TaskQuickAddCopy {
  readonly label: string
  readonly placeholder: string
  /** `{name}` is the record the task will be linked to. */
  readonly placeholderFor: string
  readonly add: string
  readonly adding: string
  readonly created: string
  readonly failed: string
}

export const TASK_QUICK_ADD_COPY: Readonly<Record<Locale, TaskQuickAddCopy>> = {
  en: {
    label: 'Task title',
    placeholder: 'Quick add: type a title',
    placeholderFor: 'Task for {name}',
    add: 'Add',
    adding: 'Adding…',
    created: 'Task added.',
    failed: 'The task was not added. Check your connection and try again.',
  },
  es: {
    label: 'Título de la tarea',
    placeholder: 'Añadir rápido: escribe un título',
    placeholderFor: 'Tarea para {name}',
    add: 'Añadir',
    adding: 'Añadiendo…',
    created: 'Tarea añadida.',
    failed: 'No se añadió la tarea. Revisa tu conexión e inténtalo de nuevo.',
  },
}

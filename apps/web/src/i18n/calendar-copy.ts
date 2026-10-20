import type { Locale } from './locale'

export interface CalendarCopy {
  /** `{count}` is how many tasks are shown. */
  readonly capped: string
  readonly add: string
  readonly title: string
  readonly date: string
  readonly people: string
  readonly cancel: string
  readonly save: string
  readonly saving: string
  readonly failed: string
  readonly hint: string
}

export const CALENDAR_COPY: Readonly<Record<Locale, CalendarCopy>> = {
  en: {
    add: 'Add task',
    title: 'What needs to happen?',
    date: 'Due date',
    people: 'Assign people',
    cancel: 'Cancel',
    save: 'Create task',
    saving: 'Saving…',
    failed: 'Could not save. Your details are still here. Try again.',
    hint: 'Right-click a day or use + to add a task. Click a task to edit its details and assignees.',
    capped: 'This month has more tasks than fit here. The first {count} are shown. Use the Tasks page to see them all.',
  },
  es: {
    add: 'Añadir tarea',
    title: '¿Qué hay que hacer?',
    date: 'Fecha de vencimiento',
    people: 'Asignar personas',
    cancel: 'Cancelar',
    save: 'Crear tarea',
    saving: 'Guardando…',
    failed: 'No se pudo guardar. Tus datos siguen aquí. Inténtalo de nuevo.',
    hint: 'Haz clic derecho en un día o usa + para añadir una tarea. Haz clic en una tarea para editar sus detalles y responsables.',
    capped:
      'Este mes tiene más tareas de las que caben aquí. Se muestran las primeras {count}. Usa la página de Tareas para verlas todas.',
  },
}

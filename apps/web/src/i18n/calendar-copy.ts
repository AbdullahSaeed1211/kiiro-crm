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
  readonly callback: string
  readonly appointment: string
  readonly lead: string
  readonly dueDate: string
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
    callback: 'Callback',
    appointment: 'Appointment',
    lead: 'Lead',
    dueDate: 'Due date',
    capped:
      'Some tasks are omitted by the calendar limit; {count} tasks are loaded. Appointments and callbacks are shown by scheduled time.',
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
    callback: 'Seguimiento',
    appointment: 'Cita',
    lead: 'Prospecto',
    dueDate: 'Fecha de vencimiento',
    capped:
      'Algunas tareas se omiten por el límite del calendario; se cargaron {count} tareas. Las citas y seguimientos se muestran por su hora programada.',
  },
}

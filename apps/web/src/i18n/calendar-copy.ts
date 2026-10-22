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
  readonly agendaHint: string
  readonly layout: string
  readonly month: string
  readonly agenda: string
  readonly previousMonth: string
  readonly nextMonth: string
  readonly today: string
  readonly task: string
  readonly noAgendaEvents: string
  readonly openMonthToAdd: string
  readonly agendaTimeZone: string
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
    agendaHint: 'Add a task beside a date, or open an item to review it.',
    layout: 'Calendar layout',
    month: 'Month',
    agenda: 'Agenda',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
    task: 'Task',
    noAgendaEvents: 'No scheduled items this month.',
    openMonthToAdd: 'Open month to choose a date and add a task',
    agendaTimeZone: 'Times use {timeZone}. Task due dates are date-only.',
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
    agendaHint: 'Añade una tarea junto a una fecha o abre un elemento para revisarlo.',
    layout: 'Vista del calendario',
    month: 'Mes',
    agenda: 'Agenda',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    today: 'Hoy',
    task: 'Tarea',
    noAgendaEvents: 'No hay elementos programados este mes.',
    openMonthToAdd: 'Abrir el mes para elegir una fecha y añadir una tarea',
    agendaTimeZone: 'Las horas usan {timeZone}. Las fechas de vencimiento no tienen hora.',
    callback: 'Seguimiento',
    appointment: 'Cita',
    lead: 'Prospecto',
    dueDate: 'Fecha de vencimiento',
    capped:
      'Algunas tareas se omiten por el límite del calendario; se cargaron {count} tareas. Las citas y seguimientos se muestran por su hora programada.',
  },
}

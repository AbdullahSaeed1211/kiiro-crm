export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled'

export type ScheduleEditorCopy = Readonly<{
  title: string
  when: string
  timeZone: string
  status: string
  scheduled: string
  completed: string
  cancelled: string
  assignees: string
  save: string
  saving: string
  cancel: string
  fail: string
  callback: string
  appointment: string
}>

const SCHEDULE_STATUSES: readonly ScheduleStatus[] = ['scheduled', 'completed', 'cancelled']

export function isScheduleStatus(value: FormDataEntryValue | null): value is ScheduleStatus {
  return typeof value === 'string' && SCHEDULE_STATUSES.some((status) => status === value)
}

export function scheduleEditorCopy(locale: string): ScheduleEditorCopy {
  if (locale === 'es') {
    return {
      title: 'Editar evento',
      when: 'Fecha y hora',
      timeZone: 'Hora del espacio de trabajo',
      status: 'Estado',
      scheduled: 'Programado',
      completed: 'Completado',
      cancelled: 'Cancelado',
      assignees: 'Asignar a',
      save: 'Guardar cambios',
      saving: 'Guardando…',
      cancel: 'Cerrar',
      fail: 'No se pudo guardar. Actualiza y vuelve a intentarlo.',
      callback: 'Seguimiento',
      appointment: 'Cita',
    }
  }
  return {
    title: 'Edit calendar item',
    when: 'Date and time',
    timeZone: 'Workspace time',
    status: 'Status',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    assignees: 'Assign to',
    save: 'Save changes',
    saving: 'Saving…',
    cancel: 'Close',
    fail: 'Could not save. Refresh and try again.',
    callback: 'Callback',
    appointment: 'Appointment',
  }
}

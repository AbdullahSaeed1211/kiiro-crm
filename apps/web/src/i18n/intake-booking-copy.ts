import type { Locale } from './locale'

export const INTAKE_BOOKING_COPY: Readonly<
  Record<Locale, { date: string; time: string; zone: string; choose: string; clear: string; invalid: string }>
> = {
  en: {
    date: 'Date',
    time: 'Time',
    zone: 'Time zone',
    choose: 'Choose a date',
    clear: 'Clear date',
    invalid: 'Choose a valid date, time and time zone. Repeated or skipped daylight-saving times cannot be booked.',
  },
  es: {
    date: 'Fecha',
    time: 'Hora',
    zone: 'Zona horaria',
    choose: 'Elige una fecha',
    clear: 'Borrar fecha',
    invalid:
      'Elige una fecha, hora y zona horaria válidas. No se admiten horas repetidas o inexistentes por el cambio de horario.',
  },
}

import type { Locale } from './locale'

export interface CalendarCopy {
  /** `{count}` is how many tasks are shown. */
  readonly capped: string
}

export const CALENDAR_COPY: Readonly<Record<Locale, CalendarCopy>> = {
  en: {
    capped: 'This month has more tasks than fit here. The first {count} are shown. Use the Tasks page to see them all.',
  },
  es: {
    capped:
      'Este mes tiene más tareas de las que caben aquí. Se muestran las primeras {count}. Usa la página de Tareas para verlas todas.',
  },
}

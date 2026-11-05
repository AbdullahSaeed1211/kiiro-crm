import type { Locale } from './locale'

/** The time log under a task: the section, its form and its list. */
export interface TimeLogCopy {
  readonly section: string
  readonly timeSpent: string
  readonly dayWorked: string
  readonly timeNote: string
  readonly notePlaceholder: string
  readonly logTime: string
}

export const TIME_LOG_COPY: Readonly<Record<Locale, TimeLogCopy>> = {
  en: {
    section: 'Time',
    timeSpent: 'Time spent',
    dayWorked: 'Day worked',
    timeNote: 'Time note',
    notePlaceholder: 'What you did (optional)',
    logTime: 'Log time',
  },
  es: {
    section: 'Tiempo',
    timeSpent: 'Tiempo dedicado',
    dayWorked: 'Día trabajado',
    timeNote: 'Nota del tiempo',
    notePlaceholder: 'Qué hiciste (opcional)',
    logTime: 'Registrar tiempo',
  },
}

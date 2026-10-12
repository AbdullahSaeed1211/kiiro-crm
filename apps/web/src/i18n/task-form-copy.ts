import { catalogFor, type Locale } from './locale'

/** Copy for the new-task form. */
export interface TaskFormLabels {
  ownerOnly: string
}

const TASK_FORM_COPY: Readonly<Record<Locale, TaskFormLabels>> = {
  en: {
    ownerOnly: 'Owner only: hide from staff',
  },
  es: {
    ownerOnly: 'Solo propietario: ocultar al personal',
  },
}

/** New-task form copy for a tenant locale, with an English fallback. */
export function taskFormLabels(locale: unknown): TaskFormLabels {
  return catalogFor(TASK_FORM_COPY, locale)
}

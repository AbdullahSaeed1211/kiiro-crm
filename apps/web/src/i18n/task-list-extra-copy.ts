import type { Locale } from './locale'

export const TASK_LIST_EXTRA_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    assignedByMe: 'Assigned by me',
    blockers: 'Blockers',
    blocked: 'Blocked',
    collaborators: 'Collaborators',
  },
  es: {
    assignedByMe: 'Asignadas por mí',
    blockers: 'Bloqueos',
    blocked: 'Bloqueada',
    collaborators: 'Colaboradores',
  },
}

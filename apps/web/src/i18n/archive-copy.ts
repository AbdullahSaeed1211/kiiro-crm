import type { Locale } from './locale'

export interface ArchiveCopy {
  readonly archive: string
  readonly archiving: string
  readonly cancel: string
  /** `{name}` is the task or project name. */
  readonly confirmTitle: string
  readonly confirmTask: string
  readonly confirmProject: string
  readonly failed: string
  readonly restore: string
  readonly restoreFailed: string
}

export const ARCHIVE_COPY: Readonly<Record<Locale, ArchiveCopy>> = {
  en: {
    archive: 'Archive',
    archiving: 'Archiving…',
    cancel: 'Cancel',
    confirmTitle: 'Archive {name}?',
    confirmTask: 'It leaves every list. Its notes and time are kept, and you can restore it later.',
    confirmProject: 'It leaves every list. Its tasks stay as they are, and you can restore it later.',
    failed: 'Could not archive it. Try again.',
    restore: 'Restore',
    restoreFailed: 'Could not restore it. Try again.',
  },
  es: {
    archive: 'Archivar',
    archiving: 'Archivando…',
    cancel: 'Cancelar',
    confirmTitle: '¿Archivar {name}?',
    confirmTask: 'Sale de todas las listas. Se conservan sus notas y su tiempo, y puedes restaurarla después.',
    confirmProject: 'Sale de todas las listas. Sus tareas quedan como están, y puedes restaurarlo después.',
    failed: 'No se pudo archivar. Inténtalo de nuevo.',
    restore: 'Restaurar',
    restoreFailed: 'No se pudo restaurar. Inténtalo de nuevo.',
  },
}

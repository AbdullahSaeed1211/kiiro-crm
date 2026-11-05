import type { Locale } from '../../i18n/locale'

const PHRASES: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    'record.created': 'Created',
    'record.archived': 'Archived',
    'record.restored': 'Restored from the archive',
    'record.converted': 'Converted',
    'field.changed': 'Edited',
    'stage.changed': 'Moved to another stage',
    'assignment.changed': 'Assigned to someone else',
    'comment.added': 'Note added',
    'mention.added': 'Someone was mentioned',
    'attachment.added': 'File attached',
    'attachment.downloaded': 'File downloaded',
    'email.sent': 'Email sent',
    'email.received': 'Email received',
    'relation.linked': 'Linked to another record',
  },
  es: {
    'record.created': 'Creado',
    'record.archived': 'Archivado',
    'record.restored': 'Restaurado del archivo',
    'record.converted': 'Convertido',
    'field.changed': 'Editado',
    'stage.changed': 'Movido a otra etapa',
    'assignment.changed': 'Asignado a otra persona',
    'comment.added': 'Nota añadida',
    'mention.added': 'Se mencionó a alguien',
    'attachment.added': 'Archivo adjunto',
    'attachment.downloaded': 'Archivo descargado',
    'email.sent': 'Correo enviado',
    'email.received': 'Correo recibido',
    'relation.linked': 'Vinculado a otro registro',
  },
}

const UPDATED: Readonly<Record<Locale, string>> = { en: 'Updated', es: 'Actualizado' }

/** What an activity entry's verb means, in words for a person, in the workspace language. */
export function describeActivity(verb: string | null, locale: Locale): string {
  return (verb === null ? undefined : PHRASES[locale][verb]) ?? UPDATED[locale]
}

/** Every verb the log can show, for the filter list. */
export const ACTIVITY_VERBS: readonly string[] = Object.keys(PHRASES.en)

import type { Locale } from './locale'

/** Shared copy for the record Notes tab. */
export const NOTES_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    empty: 'No notes yet.',
    placeholder: 'Write a note…',
    mentionHint: 'Mention teammates with @name.',
    addNote: 'Add note',
    posting: 'Posting…',
    comment: 'Comment',
    delete: 'Delete',
    deleted: '[deleted]',
    notFound: "Note not found or you don't have permission to delete it.",
    error: 'Unable to add note.',
  },
  es: {
    empty: 'Sin notas aún.',
    placeholder: 'Escribe una nota…',
    mentionHint: 'Menciona a compañeros con @nombre.',
    addNote: 'Añadir nota',
    posting: 'Publicando…',
    comment: 'Comentario',
    delete: 'Eliminar',
    deleted: '[eliminado]',
    notFound: 'Nota no encontrada o no tienes permisos para eliminarla.',
    error: 'No se pudo añadir la nota.',
  },
}

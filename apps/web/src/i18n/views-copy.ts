import type { Locale } from './locale'

/** Settings, Views: the page text and the saved-view list. `{name}` is a view's name. */
export interface ViewsCopy {
  readonly intro: string
  readonly listTitle: string
  readonly listIntro: string
  readonly empty: string
  readonly listAria: string
  readonly renameAria: string
  readonly shared: string
  readonly personal: string
  readonly pinned: string
  readonly default: string
  readonly pin: string
  readonly unpin: string
  readonly setDefault: string
  readonly save: string
  readonly saving: string
  readonly cancel: string
  readonly edit: string
  readonly delete: string
  readonly deleting: string
  readonly confirmDelete: string
  /** Plural record-type names by type. */
  readonly types: Readonly<Record<string, string>>
  /** View kind names by kind. */
  readonly kinds: Readonly<Record<string, string>>
}

export const VIEWS_COPY: Readonly<Record<Locale, ViewsCopy>> = {
  en: {
    intro:
      'Shared views are available to everyone in this workspace. Personal views can be added from the relevant list when that surface supports them.',
    listTitle: 'Saved views',
    listIntro: 'Shared and personal views available in each record list.',
    empty: 'No saved views yet.',
    listAria: 'Saved views',
    renameAria: 'Saved view name',
    shared: 'Shared',
    personal: 'Personal',
    pinned: 'Pinned',
    default: 'Default',
    pin: 'Pin',
    unpin: 'Unpin',
    setDefault: 'Set default',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting…',
    confirmDelete: 'Delete “{name}”?',
    types: {
      organization: 'Organizations',
      contact: 'Contacts',
      lead: 'Leads',
      deal: 'Deals',
      project: 'Projects',
      task: 'Tasks',
    },
    kinds: { table: 'table', board: 'board', calendar: 'calendar', timeline: 'timeline' },
  },
  es: {
    intro:
      'Las vistas compartidas están disponibles para todo el espacio de trabajo. Las vistas personales se pueden agregar desde la lista correspondiente cuando esa pantalla las admite.',
    listTitle: 'Vistas guardadas',
    listIntro: 'Vistas compartidas y personales disponibles en cada lista de registros.',
    empty: 'Aún no hay vistas guardadas.',
    listAria: 'Vistas guardadas',
    renameAria: 'Nombre de la vista guardada',
    shared: 'Compartida',
    personal: 'Personal',
    pinned: 'Fijada',
    default: 'Predeterminada',
    pin: 'Fijar',
    unpin: 'Desfijar',
    setDefault: 'Predeterminar',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    deleting: 'Eliminando…',
    confirmDelete: '¿Eliminar “{name}”?',
    types: {
      organization: 'Organizaciones',
      contact: 'Contactos',
      lead: 'Prospectos',
      deal: 'Oportunidades',
      project: 'Proyectos',
      task: 'Tareas',
    },
    kinds: { table: 'tabla', board: 'tablero', calendar: 'calendario', timeline: 'cronograma' },
  },
}

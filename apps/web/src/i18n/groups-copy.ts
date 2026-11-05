import type { Locale } from './locale'

/** Settings, Groups: the create form and the list of existing groups. */
export interface GroupsCopy {
  readonly groupName: string
  readonly namePlaceholder: string
  readonly create: string
  readonly saving: string
  readonly saved: string
  readonly saveFailed: string
  readonly existing: string
  readonly existingHelp: string
  readonly none: string
  readonly list: string
  readonly save: string
  readonly cancel: string
  readonly edit: string
  readonly delete: string
  readonly updateFailed: string
  readonly deleteFailed: string
  /** `{name}` is the group. */
  readonly confirmDelete: string
  readonly deleted: string
}

export const GROUPS_COPY: Readonly<Record<Locale, GroupsCopy>> = {
  en: {
    groupName: 'Group name',
    namePlaceholder: 'Sales',
    create: 'Create group',
    saving: 'Saving…',
    saved: 'Group saved.',
    saveFailed: 'Unable to save group. Try again.',
    existing: 'Existing groups',
    existingHelp: 'Rename or remove teams without leaving this page.',
    none: 'No groups yet.',
    list: 'Groups',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    updateFailed: 'Could not save this group. Please try again.',
    deleteFailed: 'Could not delete this group. Please try again.',
    confirmDelete: 'Delete the “{name}” group?',
    deleted: 'Group deleted.',
  },
  es: {
    groupName: 'Nombre del grupo',
    namePlaceholder: 'Ventas',
    create: 'Crear grupo',
    saving: 'Guardando…',
    saved: 'Grupo guardado.',
    saveFailed: 'No se pudo guardar el grupo. Inténtalo de nuevo.',
    existing: 'Grupos existentes',
    existingHelp: 'Renombra o quita equipos sin salir de esta página.',
    none: 'Aún no hay grupos.',
    list: 'Grupos',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    updateFailed: 'No se pudo guardar este grupo. Inténtalo de nuevo.',
    deleteFailed: 'No se pudo eliminar este grupo. Inténtalo de nuevo.',
    confirmDelete: '¿Eliminar el grupo “{name}”?',
    deleted: 'Grupo eliminado.',
  },
}

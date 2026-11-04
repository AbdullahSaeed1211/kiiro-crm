import type { Locale } from './locale'

export interface ShortcutsCopy {
  readonly title: string
  readonly description: string
  readonly general: string
  readonly create: string
  readonly goTo: string
  readonly then: string
  readonly commandMenu: string
  readonly toggleSidebar: string
  readonly searchPage: string
  readonly showShortcuts: string
  readonly close: string
  readonly newRecord: string
  readonly newTask: string
  readonly typingNote: string
}

export const SHORTCUTS_COPY: Readonly<Record<Locale, ShortcutsCopy>> = {
  en: {
    title: 'Keyboard shortcuts',
    description: 'Single keys work when you are not typing in a field.',
    general: 'General',
    create: 'Create',
    goTo: 'Go to',
    then: 'then',
    commandMenu: 'Search and commands',
    toggleSidebar: 'Show or hide the sidebar',
    searchPage: 'Search this page',
    showShortcuts: 'Show these shortcuts',
    close: 'Close a panel or dialog',
    newRecord: 'New record on a list page',
    newTask: 'New task',
    typingNote: 'Shortcuts are off while you type in a field.',
  },
  es: {
    title: 'Atajos de teclado',
    description: 'Las teclas sueltas funcionan cuando no escribes en un campo.',
    general: 'General',
    create: 'Crear',
    goTo: 'Ir a',
    then: 'luego',
    commandMenu: 'Buscar y comandos',
    toggleSidebar: 'Mostrar u ocultar la barra lateral',
    searchPage: 'Buscar en esta página',
    showShortcuts: 'Mostrar estos atajos',
    close: 'Cerrar un panel o diálogo',
    newRecord: 'Nuevo registro en una lista',
    newTask: 'Nueva tarea',
    typingNote: 'Los atajos se desactivan mientras escribes en un campo.',
  },
}

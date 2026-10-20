import type { Locale } from './locale'

export interface ProjectPageCopy {
  readonly projects: string
  readonly breadcrumb: string
  readonly saveTitle: string
  readonly cancelTitle: string
  readonly overview: string
  readonly board: string
  readonly list: string
  readonly description: string
  readonly noDescription: string
  readonly work: string
  /** One task in the project. */
  readonly taskCountOne: string
  /** `{count}` tasks in the project. */
  readonly taskCountOther: string
  readonly noProjectTasks: string
  readonly noProjectTasksHelp: string
  readonly noTasksYet: string
  readonly createTask: string
  readonly details: string
  readonly organization: string
  readonly notLinked: string
  readonly members: string
  readonly targetEnd: string
  readonly noTarget: string
}

export const PROJECT_PAGE_COPY: Readonly<Record<Locale, ProjectPageCopy>> = {
  en: {
    projects: 'Projects',
    breadcrumb: 'Breadcrumb',
    saveTitle: 'Save title',
    cancelTitle: 'Cancel',
    overview: 'Overview',
    board: 'Board',
    list: 'List',
    description: 'Description',
    noDescription: 'No description yet.',
    work: 'Work',
    taskCountOne: '1 task in this project',
    taskCountOther: '{count} tasks in this project',
    noProjectTasks: 'No project tasks',
    noProjectTasksHelp: 'Create a task from the Tasks workspace, then assign it to this project.',
    noTasksYet: 'No tasks in this project yet.',
    createTask: 'Create task',
    details: 'Details',
    organization: 'Organization',
    notLinked: 'Not linked',
    members: 'Members',
    targetEnd: 'Target end',
    noTarget: 'No target',
  },
  es: {
    projects: 'Proyectos',
    breadcrumb: 'Ruta de navegación',
    saveTitle: 'Guardar título',
    cancelTitle: 'Cancelar',
    overview: 'Resumen',
    board: 'Tablero',
    list: 'Lista',
    description: 'Descripción',
    noDescription: 'Aún no hay descripción.',
    work: 'Trabajo',
    taskCountOne: '1 tarea en este proyecto',
    taskCountOther: '{count} tareas en este proyecto',
    noProjectTasks: 'No hay tareas del proyecto',
    noProjectTasksHelp: 'Crea una tarea desde Tareas y asígnala a este proyecto.',
    noTasksYet: 'Este proyecto aún no tiene tareas.',
    createTask: 'Crear tarea',
    details: 'Detalles',
    organization: 'Organización',
    notLinked: 'Sin vincular',
    members: 'Miembros',
    targetEnd: 'Fecha objetivo',
    noTarget: 'Sin fecha objetivo',
  },
}

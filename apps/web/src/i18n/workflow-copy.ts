import type { Locale } from './locale'

export interface WorkflowCopy {
  readonly workflowName: string
  readonly recordType: string
  readonly recordTypes: Readonly<Record<string, string>>
  readonly stagesTitle: string
  readonly stagesHelp: string
  readonly start: string
  readonly startHelp: string
  readonly endsHere: string
  readonly stageName: string
  readonly stageNamePlaceholder: string
  readonly stageType: string
  readonly categories: Readonly<Record<string, string>>
  readonly colour: string
  readonly colours: Readonly<Record<string, string>>
  readonly chance: string
  readonly requiredBefore: string
  readonly nothingRequired: string
  /** `{name}` is the stage name. */
  readonly requiredFor: string
  readonly moveEarlier: string
  readonly moveLater: string
  readonly removeStage: string
  readonly addStageAt: string
  readonly addStage: string
  readonly dragToMove: string
  readonly save: string
  readonly saving: string
  readonly delete: string
  readonly deleting: string
  readonly saved: string
  readonly saveFailed: string
  readonly needsNames: string
  readonly unnamed: string
  /** `{name}` is the workflow name. */
  readonly confirmDelete: string
  readonly deleted: string
  readonly deleteFailed: string
  readonly pageTitle: string
  readonly pageDescription: string
  readonly intro: string
  readonly addWorkflow: string
  readonly cancelNew: string
  readonly firstStep: string
  readonly create: string
  readonly creating: string
  readonly created: string
  readonly createNeedsNames: string
  readonly createFailed: string
}

export const WORKFLOW_COPY: Readonly<Record<Locale, WorkflowCopy>> = {
  en: {
    workflowName: 'Workflow name',
    recordType: 'Used for',
    recordTypes: {
      organization: 'Organizations',
      contact: 'Contacts',
      lead: 'Leads',
      deal: 'Deals',
      project: 'Projects',
      task: 'Tasks',
    },
    stagesTitle: 'Steps',
    stagesHelp: 'A record moves from left to right. Drag a step to change the order.',
    start: 'Start',
    startHelp: 'New records begin in the first open step.',
    endsHere: 'Ends the work',
    stageName: 'Step name',
    stageNamePlaceholder: 'e.g. Proposal sent',
    stageType: 'Type of step',
    categories: {
      backlog: 'Not started',
      open: 'Open',
      active: 'In progress',
      waiting: 'Waiting',
      done_success: 'Done (won)',
      done_failure: 'Done (lost)',
      cancelled: 'Cancelled',
    },
    colour: 'Colour',
    colours: {
      gray: 'Gray',
      blue: 'Blue',
      green: 'Green',
      amber: 'Amber',
      red: 'Red',
      violet: 'Violet',
      teal: 'Teal',
      pink: 'Pink',
    },
    chance: 'Chance of winning (%)',
    requiredBefore: 'Must be filled in first',
    nothingRequired: 'Nothing',
    requiredFor: 'Required fields for {name}',
    moveEarlier: 'Move {name} earlier',
    moveLater: 'Move {name} later',
    removeStage: 'Remove {name}',
    addStageAt: 'Add a step here',
    addStage: 'Add step',
    dragToMove: 'Drag to move {name}',
    save: 'Save workflow',
    saving: 'Saving…',
    delete: 'Delete',
    deleting: 'Deleting…',
    saved: 'Workflow saved.',
    saveFailed: 'Could not save the workflow. Try again.',
    needsNames: 'Give the workflow a name, give every step a name, and keep at least one open step.',
    unnamed: 'Unnamed step',
    confirmDelete: 'Delete the workflow “{name}”?',
    deleted: 'Workflow deleted.',
    deleteFailed: 'Could not delete the workflow. Try again.',
    pageTitle: 'Workflows',
    pageDescription: 'Set the steps each kind of record goes through.',
    intro:
      'Each workflow is its own list of steps. A sales pipeline, a service queue and a project board can each use words that fit your business.',
    addWorkflow: 'Add workflow',
    cancelNew: 'Cancel',
    firstStep: 'First step',
    create: 'Create workflow',
    creating: 'Creating…',
    created: 'Workflow created.',
    createNeedsNames: 'Give the workflow a name and a first step.',
    createFailed: 'Could not create the workflow. Try again.',
  },
  es: {
    workflowName: 'Nombre del flujo',
    recordType: 'Se usa para',
    recordTypes: {
      organization: 'Organizaciones',
      contact: 'Contactos',
      lead: 'Prospectos',
      deal: 'Oportunidades',
      project: 'Proyectos',
      task: 'Tareas',
    },
    stagesTitle: 'Pasos',
    stagesHelp: 'Un registro avanza de izquierda a derecha. Arrastra un paso para cambiar el orden.',
    start: 'Inicio',
    startHelp: 'Los registros nuevos empiezan en el primer paso abierto.',
    endsHere: 'Termina el trabajo',
    stageName: 'Nombre del paso',
    stageNamePlaceholder: 'p. ej. Propuesta enviada',
    stageType: 'Tipo de paso',
    categories: {
      backlog: 'Sin empezar',
      open: 'Abierto',
      active: 'En curso',
      waiting: 'En espera',
      done_success: 'Hecho (ganado)',
      done_failure: 'Hecho (perdido)',
      cancelled: 'Cancelado',
    },
    colour: 'Color',
    colours: {
      gray: 'Gris',
      blue: 'Azul',
      green: 'Verde',
      amber: 'Ámbar',
      red: 'Rojo',
      violet: 'Violeta',
      teal: 'Turquesa',
      pink: 'Rosa',
    },
    chance: 'Probabilidad de ganar (%)',
    requiredBefore: 'Debe completarse antes',
    nothingRequired: 'Nada',
    requiredFor: 'Campos obligatorios para {name}',
    moveEarlier: 'Mover {name} antes',
    moveLater: 'Mover {name} después',
    removeStage: 'Quitar {name}',
    addStageAt: 'Añadir un paso aquí',
    addStage: 'Añadir paso',
    dragToMove: 'Arrastra para mover {name}',
    save: 'Guardar flujo',
    saving: 'Guardando…',
    delete: 'Eliminar',
    deleting: 'Eliminando…',
    saved: 'Flujo guardado.',
    saveFailed: 'No se pudo guardar el flujo. Inténtalo de nuevo.',
    needsNames: 'Ponle nombre al flujo y a cada paso, y deja al menos un paso abierto.',
    unnamed: 'Paso sin nombre',
    confirmDelete: '¿Eliminar el flujo “{name}”?',
    deleted: 'Flujo eliminado.',
    deleteFailed: 'No se pudo eliminar el flujo. Inténtalo de nuevo.',
    pageTitle: 'Flujos de trabajo',
    pageDescription: 'Define los pasos por los que pasa cada tipo de registro.',
    intro:
      'Cada flujo es su propia lista de pasos. Un embudo de ventas, una cola de servicio y un tablero de proyecto pueden usar palabras propias de tu negocio.',
    addWorkflow: 'Añadir flujo',
    cancelNew: 'Cancelar',
    firstStep: 'Primer paso',
    create: 'Crear flujo',
    creating: 'Creando…',
    created: 'Flujo creado.',
    createNeedsNames: 'Ponle un nombre al flujo y un primer paso.',
    createFailed: 'No se pudo crear el flujo. Inténtalo de nuevo.',
  },
}

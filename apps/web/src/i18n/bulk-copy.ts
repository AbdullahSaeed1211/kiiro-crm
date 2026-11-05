import type { Locale } from './locale'

/** The bars that act on several selected rows: record tables (owner, stage) and the task table (done, priority). */
export interface BulkCopy {
  readonly group: string
  readonly assignOwner: string
  readonly assignOwnerPlaceholder: string
  readonly moveToStage: string
  readonly moveToStagePlaceholder: string
  readonly unassigned: string
  /** `{count}` selected rows. */
  readonly apply: string
  /** `{updated}` changed and `{skipped}` left alone. */
  readonly result: string
  readonly markDone: string
  readonly setPriority: string
  readonly setPriorityPlaceholder: string
  readonly assignToMe: string
}

export const BULK_COPY: Readonly<Record<Locale, BulkCopy>> = {
  en: {
    group: 'Bulk actions',
    assignOwner: 'Assign owner',
    assignOwnerPlaceholder: 'Assign owner…',
    moveToStage: 'Move to stage',
    moveToStagePlaceholder: 'Move to stage…',
    unassigned: 'Unassigned',
    apply: 'Apply to {count}',
    result: '{updated} updated, {skipped} skipped',
    markDone: 'Mark {count} done',
    setPriority: 'Set priority',
    setPriorityPlaceholder: 'Set priority…',
    assignToMe: 'Assign to me',
  },
  es: {
    group: 'Acciones en bloque',
    assignOwner: 'Asignar responsable',
    assignOwnerPlaceholder: 'Asignar responsable…',
    moveToStage: 'Mover a etapa',
    moveToStagePlaceholder: 'Mover a etapa…',
    unassigned: 'Sin asignar',
    apply: 'Aplicar a {count}',
    result: '{updated} actualizados, {skipped} omitidos',
    markDone: 'Marcar {count} como hechas',
    setPriority: 'Cambiar prioridad',
    setPriorityPlaceholder: 'Cambiar prioridad…',
    assignToMe: 'Asignarme',
  },
}

import type { KanbanBoardLabels } from '@ops/ui/composites/KanbanBoard'
import type { Locale } from './locale'

/** What the deal and lead boards say beside their cards and columns. */
export interface BoardLabelsCopy {
  readonly expand: string
  readonly collapse: string
  readonly moveTo: string
  readonly conflict: string
  readonly moveFailedDeal: string
  readonly moveFailedLead: string
}

export const BOARD_LABELS_COPY: Readonly<Record<Locale, BoardLabelsCopy>> = {
  en: {
    expand: 'Expand {name}',
    collapse: 'Collapse {name}',
    moveTo: 'Move to…',
    conflict: 'Updated by someone else, refreshed',
    moveFailedDeal: 'Could not move the deal',
    moveFailedLead: 'Could not move the lead',
  },
  es: {
    expand: 'Expandir {name}',
    collapse: 'Contraer {name}',
    moveTo: 'Mover a…',
    conflict: 'Otra persona lo actualizó; se recargó',
    moveFailedDeal: 'No se pudo mover la oportunidad',
    moveFailedLead: 'No se pudo mover el prospecto',
  },
}

/** The labels the kanban board needs, for the deal board or the lead board. */
export function boardLabels(locale: Locale, noun: 'deal' | 'lead'): KanbanBoardLabels {
  const copy = BOARD_LABELS_COPY[locale]
  return {
    expand: copy.expand,
    collapse: copy.collapse,
    moveTo: copy.moveTo,
    conflict: copy.conflict,
    moveFailed: noun === 'deal' ? copy.moveFailedDeal : copy.moveFailedLead,
  }
}

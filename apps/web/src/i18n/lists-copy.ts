import type { Locale } from './locale'

interface ListText {
  readonly title: string
  readonly help: string
}

/** Settings, Lists: the two editable lists and the editor's own text. `{name}` is an entry's name. */
export interface ListsCopy {
  readonly source: ListText
  readonly lostReason: ListText
  readonly empty: string
  readonly remove: string
  readonly removeAria: string
  readonly add: string
  readonly newEntryAria: string
  readonly failed: string
}

export const LISTS_COPY: Readonly<Record<Locale, ListsCopy>> = {
  en: {
    source: {
      title: 'Lead sources',
      help: 'Where leads come from. Used on every lead, in assignment rules and in the Where leads come from chart.',
    },
    lostReason: {
      title: 'Lost reasons',
      help: 'Why a lead or deal was lost. A reason is required when marking one lost.',
    },
    empty: 'Nothing here yet. Add the first one below.',
    remove: 'Remove',
    removeAria: 'Remove {name}',
    add: 'Add',
    newEntryAria: 'New {list} entry',
    failed: 'Unable to save.',
  },
  es: {
    source: {
      title: 'Orígenes de prospectos',
      help: 'De dónde llegan los prospectos. Se usa en cada prospecto, en las reglas de asignación y en el gráfico De dónde llegan los prospectos.',
    },
    lostReason: {
      title: 'Motivos de pérdida',
      help: 'Por qué se perdió un prospecto o una oportunidad. Hace falta un motivo al marcarlo como perdido.',
    },
    empty: 'Aún no hay nada. Agrega el primero abajo.',
    remove: 'Quitar',
    removeAria: 'Quitar {name}',
    add: 'Agregar',
    newEntryAria: 'Nueva entrada de {list}',
    failed: 'No se pudo guardar.',
  },
}

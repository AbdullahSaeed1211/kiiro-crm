import type { Locale } from './locale'

export interface DealBoardCopy {
  /** Shown in place of a stage total when its deals use more than one currency. */
  readonly mixedCurrencies: string
  readonly board: string
  readonly views: string
  readonly table: string
  readonly boardView: string
  readonly searchDeals: string
  readonly owner: string
  readonly unassigned: string
  readonly expectedClose: string
}

export const DEAL_BOARD_COPY: Readonly<Record<Locale, DealBoardCopy>> = {
  en: {
    mixedCurrencies: 'Mixed currencies',
    board: 'Deal board',
    views: 'Deal views',
    table: 'Table',
    boardView: 'Board',
    searchDeals: 'Search deals',
    owner: 'Owner: {name}',
    unassigned: 'Unassigned',
    expectedClose: 'Expected close: {date}',
  },
  es: {
    mixedCurrencies: 'Monedas mezcladas',
    board: 'Tablero de oportunidades',
    views: 'Vistas de oportunidades',
    table: 'Tabla',
    boardView: 'Tablero',
    searchDeals: 'Buscar oportunidades',
    owner: 'Responsable: {name}',
    unassigned: 'Sin asignar',
    expectedClose: 'Cierre previsto: {date}',
  },
}

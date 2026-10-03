import type { Locale } from './locale'

export interface DealBoardCopy {
  /** Shown in place of a stage total when its deals use more than one currency. */
  readonly mixedCurrencies: string
}

export const DEAL_BOARD_COPY: Readonly<Record<Locale, DealBoardCopy>> = {
  en: { mixedCurrencies: 'Mixed currencies' },
  es: { mixedCurrencies: 'Monedas mezcladas' },
}

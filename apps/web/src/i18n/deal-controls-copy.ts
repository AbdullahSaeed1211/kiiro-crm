import type { Locale } from './locale'

export interface DealControlsCopy {
  readonly stage: string
  readonly closedGroup: string
  readonly selectStage: string
  readonly useMarkLost: string
  /** `{currency}` is the deal's currency code. */
  readonly value: string
  readonly invalidValue: string
  readonly invalidDate: string
  readonly expectedClose: string
  readonly save: string
  readonly saveDate: string
  readonly markWon: string
  readonly reopen: string
  readonly markLost: string
}

export const DEAL_CONTROLS_COPY: Readonly<Record<Locale, DealControlsCopy>> = {
  en: {
    stage: 'Stage',
    closedGroup: 'Closed',
    selectStage: 'Select stage',
    useMarkLost: 'Choose a lost reason and use Mark lost to close this deal.',
    value: 'Value ({currency})',
    invalidValue: 'Enter a valid deal value.',
    invalidDate: 'Enter a valid date.',
    expectedClose: 'Expected close',
    save: 'Save',
    saveDate: 'Save date',
    markWon: 'Mark won',
    reopen: 'Reopen',
    markLost: 'Mark lost',
  },
  es: {
    stage: 'Etapa',
    closedGroup: 'Cerradas',
    selectStage: 'Elegir etapa',
    useMarkLost: 'Elige un motivo y usa Marcar como perdida para cerrar esta oportunidad.',
    value: 'Valor ({currency})',
    invalidValue: 'Ingresa un valor válido.',
    invalidDate: 'Ingresa una fecha válida.',
    expectedClose: 'Cierre previsto',
    save: 'Guardar',
    saveDate: 'Guardar fecha',
    markWon: 'Marcar como ganada',
    reopen: 'Reabrir',
    markLost: 'Marcar como perdida',
  },
}

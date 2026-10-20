import type { Locale } from './locale'

export interface LostReasonCopy {
  readonly titleLead: string
  readonly titleDeal: string
  readonly description: string
  readonly reasonLabel: string
  readonly noteLabel: string
  readonly notePlaceholder: string
  readonly cancel: string
  readonly submit: string
  readonly saving: string
}

export const LOST_REASON_COPY: Readonly<Record<Locale, LostReasonCopy>> = {
  en: {
    titleLead: 'Mark lead as lost',
    titleDeal: 'Mark deal as lost',
    description: 'Choose a reason so the pipeline stays useful.',
    reasonLabel: 'Lost reason',
    noteLabel: 'Note (optional)',
    notePlaceholder: 'What happened?',
    cancel: 'Cancel',
    submit: 'Mark lost',
    saving: 'Saving…',
  },
  es: {
    titleLead: 'Marcar prospecto como perdido',
    titleDeal: 'Marcar oportunidad como perdida',
    description: 'Elige un motivo para que el embudo siga siendo útil.',
    reasonLabel: 'Motivo de pérdida',
    noteLabel: 'Nota (opcional)',
    notePlaceholder: '¿Qué pasó?',
    cancel: 'Cancelar',
    submit: 'Marcar como perdido',
    saving: 'Guardando…',
  },
}

import type { Locale } from './locale'

export interface CallLogCopy {
  readonly heading: string
  readonly addCall: string
  readonly outcome: string
  readonly answered: string
  readonly noAnswer: string
  readonly voicemail: string
  readonly followUp: string
  readonly notes: string
  readonly optional: string
  readonly save: string
  readonly saving: string
  readonly empty: string
  readonly by: string
  readonly saved: string
  readonly error: string
}

export const CALL_LOG_COPY: Readonly<Record<Locale, CallLogCopy>> = {
  en: {
    heading: 'Calls',
    addCall: 'Log a call',
    outcome: 'Outcome',
    answered: 'Answered',
    noAnswer: 'No answer',
    voicemail: 'Voicemail',
    followUp: 'Follow-up needed',
    notes: 'Notes',
    optional: 'Optional',
    save: 'Save call',
    saving: 'Saving…',
    empty: 'No calls logged yet.',
    by: 'by',
    saved: 'Call logged.',
    error: 'Could not save the call.',
  },
  es: {
    heading: 'Llamadas',
    addCall: 'Registrar llamada',
    outcome: 'Resultado',
    answered: 'Contestada',
    noAnswer: 'Sin respuesta',
    voicemail: 'Buzón de voz',
    followUp: 'Requiere seguimiento',
    notes: 'Notas',
    optional: 'Opcional',
    save: 'Guardar llamada',
    saving: 'Guardando…',
    empty: 'Aún no hay llamadas registradas.',
    by: 'por',
    saved: 'Llamada registrada.',
    error: 'No se pudo guardar la llamada.',
  },
}

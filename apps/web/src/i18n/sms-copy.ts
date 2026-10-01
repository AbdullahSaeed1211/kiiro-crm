import type { Locale } from './locale'

export interface SmsCopy {
  readonly open: string
  readonly title: string
  /** `{phone}` is the number the text goes to. */
  readonly to: string
  readonly messageLabel: string
  /** `{used}` and `{max}` are character counts. */
  readonly counter: string
  readonly send: string
  readonly sending: string
  readonly failed: string
}

export const SMS_COPY: Readonly<Record<Locale, SmsCopy>> = {
  en: {
    open: 'Text',
    title: 'Send a text',
    to: 'To {phone}. The text is saved on this record.',
    messageLabel: 'Text message',
    counter: '{used} of {max} characters',
    send: 'Send text',
    sending: 'Sending…',
    failed: 'Could not send the text. Try again.',
  },
  es: {
    open: 'Texto',
    title: 'Enviar un texto',
    to: 'Para {phone}. El texto se guarda en este registro.',
    messageLabel: 'Mensaje de texto',
    counter: '{used} de {max} caracteres',
    send: 'Enviar texto',
    sending: 'Enviando…',
    failed: 'No se pudo enviar el texto. Inténtalo de nuevo.',
  },
}

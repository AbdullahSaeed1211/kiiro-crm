import type { Locale } from './locale'

export const INTAKE_BOOKING_COPY: Readonly<
  Record<
    Locale,
    {
      date: string
      time: string
      zone: string
      choose: string
      clear: string
      invalid: string
      another: string
      chooseOption: string
      send: string
      sending: string
      audioHelp: string
    }
  >
> = {
  en: {
    date: 'Date',
    time: 'Time',
    zone: 'Time zone',
    choose: 'Choose a date',
    clear: 'Clear date',
    invalid: 'Choose a valid date, time and time zone. Repeated or skipped daylight-saving times cannot be booked.',
    another: 'Send another response',
    chooseOption: 'Choose an option',
    send: 'Send',
    sending: 'Sending…',
    audioHelp: 'MP3, M4A, WAV, OGG or WebM · Up to 10 MB',
  },
  es: {
    date: 'Fecha',
    time: 'Hora',
    zone: 'Zona horaria',
    choose: 'Elige una fecha',
    clear: 'Borrar fecha',
    invalid:
      'Elige una fecha, hora y zona horaria válidas. No se admiten horas repetidas o inexistentes por el cambio de horario.',
    another: 'Enviar otra respuesta',
    chooseOption: 'Elige una opción',
    send: 'Enviar',
    sending: 'Enviando…',
    audioHelp: 'MP3, M4A, WAV, OGG o WebM · Hasta 10 MB',
  },
}

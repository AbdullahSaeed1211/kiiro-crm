import type { Locale } from './locale'

export interface WebhooksCopy {
  readonly help: string
  readonly add: string
  readonly save: string
  readonly recent: string
  readonly none: string
}

export const WEBHOOKS_COPY: Readonly<Record<Locale, WebhooksCopy>> = {
  en: {
    help: 'Save a webhook before sending a test. A test sends a webhook.test event and shows what the other system answered.',
    add: 'Add webhook',
    save: 'Save webhooks',
    recent: 'Recent deliveries',
    none: 'Nothing has been sent yet. Each event, and what the other system answered, is listed here for two weeks.',
  },
  es: {
    help: 'Guarda un webhook antes de enviar una prueba. Una prueba envía un evento webhook.test y muestra lo que respondió el otro sistema.',
    add: 'Agregar webhook',
    save: 'Guardar webhooks',
    recent: 'Entregas recientes',
    none: 'Todavía no se ha enviado nada. Cada evento y lo que respondió el otro sistema se lista aquí durante dos semanas.',
  },
}

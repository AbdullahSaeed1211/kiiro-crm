import type { Locale } from './locale'

export interface NewsletterCopy {
  readonly intro: string
  readonly enable: string
}

export const NEWSLETTER_COPY: Readonly<Record<Locale, NewsletterCopy>> = {
  en: {
    intro:
      'Turn this on to add a "Newsletter subscriber" checkbox to every contact and a "Newsletter opt-in" checkbox to every lead. Contacts who are ticked receive the newsletter; when a lead who opted in is converted, its contact is ticked. Map a website form question to the lead\'s opt-in under Settings, Intake.',
    enable: 'Turn on newsletter',
  },
  es: {
    intro:
      'Actívalo para agregar una casilla "Suscriptor del boletín" a cada contacto y una casilla "Acepta el boletín" a cada prospecto. Los contactos marcados reciben el boletín; cuando se convierte un prospecto que aceptó, su contacto queda marcado. Asocia una pregunta del formulario web con la casilla del prospecto en Ajustes, Captura.',
    enable: 'Activar boletín',
  },
}

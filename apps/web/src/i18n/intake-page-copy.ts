import type { Locale } from './locale'

export interface IntakePageCopy {
  readonly create: string
  readonly failClosed: string
  readonly none: string
}

export const INTAKE_PAGE_COPY: Readonly<Record<Locale, IntakePageCopy>> = {
  en: {
    create: 'Create a form',
    failClosed: 'New forms start fail-closed: add an exact website origin before accepting browser submissions.',
    none: 'No intake forms yet.',
  },
  es: {
    create: 'Crear un formulario',
    failClosed:
      'Los formularios nuevos empiezan cerrados: agrega un origen exacto del sitio web antes de aceptar envíos desde el navegador.',
    none: 'Aún no hay formularios de captura.',
  },
}

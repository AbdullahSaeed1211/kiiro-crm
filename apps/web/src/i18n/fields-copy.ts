import type { Locale } from './locale'

export interface FieldsCopy {
  readonly intro: string
  readonly empty: string
  readonly add: string
}

export const FIELDS_COPY: Readonly<Record<Locale, FieldsCopy>> = {
  en: {
    intro:
      'Add business-specific fields once and reuse them across forms and record pages. Hidden and sensitive fields remain governed by workspace roles.',
    empty: 'No custom fields yet.',
    add: 'Add custom field',
  },
  es: {
    intro:
      'Agrega campos propios del negocio una vez y reutilízalos en formularios y páginas de registros. Los campos ocultos y sensibles siguen sujetos a los roles del espacio de trabajo.',
    empty: 'Aún no hay campos personalizados.',
    add: 'Agregar campo personalizado',
  },
}

import type { Locale } from './locale'

export interface NotFoundCopy {
  readonly title: string
  readonly body: string
  readonly home: string
}

export const NOT_FOUND_COPY: Readonly<Record<Locale, NotFoundCopy>> = {
  en: {
    title: 'We could not find that page',
    body: 'The link may be old, or the record may have been removed. You may also not have access to it.',
    home: 'Go to the dashboard',
  },
  es: {
    title: 'No encontramos esa página',
    body: 'El enlace puede ser antiguo o el registro puede haberse eliminado. Tal vez tampoco tengas acceso.',
    home: 'Ir al panel',
  },
}

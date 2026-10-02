import type { Locale } from './locale'

export interface PageLoadingCopy {
  readonly loading: string
}

export const PAGE_LOADING_COPY: Readonly<Record<Locale, PageLoadingCopy>> = {
  en: { loading: 'Loading' },
  es: { loading: 'Cargando' },
}

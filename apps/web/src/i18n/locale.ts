/** Supported tenant locales. Add a catalog and formatter entry before exposing a new value. */
export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function normalizeLocale(value: unknown): Locale {
  return value === 'es' ? 'es' : 'en'
}

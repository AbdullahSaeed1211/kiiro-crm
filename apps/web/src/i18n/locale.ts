/** Supported tenant locales. Add a catalog and formatter entry before exposing a new value. */
export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function normalizeLocale(value: unknown): Locale {
  return value === 'es' ? 'es' : 'en'
}

/** Resolves a catalog with a safe English fallback for unknown or not-yet-provisioned locales. */
export function catalogFor<T>(catalog: Readonly<Record<Locale, T>>, value: unknown): T {
  return catalog[normalizeLocale(value)]
}

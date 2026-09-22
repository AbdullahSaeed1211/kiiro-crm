/** Maps the tenant locale to the browser/Node Intl locale tag. */
function localeTag(locale: string | undefined): string {
  return locale === 'es' ? 'es-ES' : 'en-US'
}

export function formatDate(
  value: number | Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(localeTag(locale), options).format(value)
}

function formatNumber(value: number, locale: string | undefined, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value)
}

export function formatCurrency(valueMinor: number, currency: string, locale: string | undefined): string {
  return formatNumber(valueMinor / 100, locale, { style: 'currency', currency, maximumFractionDigits: 2 })
}

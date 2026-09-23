export type CurrencyOption = Readonly<{ value: string; label: string }>

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

export const CURRENCY_OPTIONS: readonly CurrencyOption[] = Intl.supportedValuesOf('currency')
  .map((value) => ({ value, label: `${currencyNames.of(value) ?? value} (${value})` }))
  .sort((left, right) => left.label.localeCompare(right.label))

export function isSupportedCurrency(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_OPTIONS.some((option) => option.value === value)
}

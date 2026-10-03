/** How many digits follow the decimal point in a currency, such as 2 for USD and 0 for JPY. */
export function minorDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

/** An amount in minor units as money in the person's language. */
export function formatMoney(input: Readonly<{ minor: number; currency: string; locale: string }>): string {
  const digits = minorDigits(input.currency)
  return new Intl.NumberFormat(input.locale, { style: 'currency', currency: input.currency }).format(
    input.minor / 10 ** digits,
  )
}

/** A typed price such as "12.50" as minor units; `undefined` when it is not a number of zero or more. */
export function toMinor(text: string, currency: string): number | undefined {
  const value = Number(text)
  return text.trim() === '' || !Number.isFinite(value) || value < 0
    ? undefined
    : Math.round(value * 10 ** minorDigits(currency))
}

/**
 * Returns a formatter from epoch milliseconds to the `YYYY-MM-DD` calendar date in the IANA `timeZone`.
 * Parts are read by type rather than parsed from the formatted string, so the result does not depend on locale data.
 * @returns the formatter; throws `RangeError` when `timeZone` is not a valid IANA zone.
 */
export function localDateFormatter(timeZone: string): (ms: number) => string {
  const format = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  return (ms) => {
    const parts = new Map(format.formatToParts(ms).map((part) => [part.type, part.value]))
    return `${parts.get('year') ?? ''}-${parts.get('month') ?? ''}-${parts.get('day') ?? ''}`
  }
}

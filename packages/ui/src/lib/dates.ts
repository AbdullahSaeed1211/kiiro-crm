/** Shared date formatting utilities. */

/**
 * Create an ISO-like date string (YYYY-MM-DD) using a locale-aware formatter.
 * Respects the formatter's timeZone to ensure dates are in the correct zone.
 */
export function formatDateISO(timestamp: number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(timestamp)
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

function machineDateParts(timestamp: number, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone,
    ...options,
  }).formatToParts(timestamp)
}

function datePart(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '00'
}

/** Stable YYYY-MM-DD key for a timestamp interpreted in the requested time zone. */
export function formatDateKey(timestamp: number, timeZone: string): string {
  const parts = machineDateParts(timestamp, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${datePart(parts, 'year')}-${datePart(parts, 'month')}-${datePart(parts, 'day')}`
}

/** Stable numeric year/month parts for machine-readable calendar query parameters. */
export function formatYearMonth(timestamp: number, timeZone: string): Readonly<{ year: string; month: string }> {
  const parts = machineDateParts(timestamp, timeZone, { year: 'numeric', month: 'numeric' })
  return { year: datePart(parts, 'year'), month: datePart(parts, 'month') }
}

/** Stable local datetime input value (YYYY-MM-DDTHH:mm), without localized digits. */
export function formatDateTimeLocalInput(timestamp: number, timeZone: string): string {
  const parts = machineDateParts(timestamp, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${datePart(parts, 'year')}-${datePart(parts, 'month')}-${datePart(parts, 'day')}T${datePart(parts, 'hour')}:${datePart(parts, 'minute')}`
}

/**
 * Format a UTC timestamp as an ISO datetime string (YYYY-MM-DD HH:mm UTC).
 * Used for activity timestamps that are always in UTC.
 */
export function formatUTCDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

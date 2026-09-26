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

/**
 * Format a UTC timestamp as an ISO datetime string (YYYY-MM-DD HH:mm UTC).
 * Used for activity timestamps that are always in UTC.
 */
export function formatUTCDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

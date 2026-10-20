/**
 * Due dates are calendar dates, not moments. A date picked as 2026-10-20 is stored as that day at 00:00 UTC and shown
 * as that date, so every comparison with "today" must use the stored date, whatever the workspace time zone is.
 */

const DAY_MS = 86_400_000

/** The calendar date (`YYYY-MM-DD`) of a stored due date. */
export function dueDay(dueAt: number): string {
  return new Date(dueAt).toISOString().slice(0, 10)
}

/** Today's calendar date (`YYYY-MM-DD`) in the workspace time zone. */
export function todayIn(now: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * Today as a stored due date (00:00 UTC of today's date in the workspace zone). A task is overdue when its `dueAt` is
 * below this, due today when it is in `[value, value + 1 day)`.
 */
export function todayAsDueAt(now: number, timeZone: string): number {
  return Date.parse(`${todayIn(now, timeZone)}T00:00:00.000Z`)
}

/** Exclusive end of the current calendar week, represented in the same UTC-date format as task due dates. */
export function weekEndAfter(today: number, startsOn: 0 | 1): number {
  const weekday = new Date(today).getUTCDay()
  return today + (7 - ((weekday - startsOn + 7) % 7)) * DAY_MS
}

export { DAY_MS }

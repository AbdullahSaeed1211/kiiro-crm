/** Most records one trigger read returns; a larger backlog waits for the next run. */
export const READ_LIMIT = 500
export const DAY_MS = 86_400_000

/** The cron window a run covers. */
export interface CandidateWindow {
  readonly start: number
  readonly end: number
}

/** A Payload timestamp as epoch milliseconds. */
export function msOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const ms = typeof value === 'string' ? Date.parse(value) : Number.NaN
  return Number.isNaN(ms) ? null : ms
}

/** An unpopulated relationship as an id string. */
export function idOf(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value
  if (typeof value === 'number') return String(value)
  return null
}

/** A has-many relationship as id strings. */
export function idsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => idOf(item) ?? []) : []
}

/** A string field, ignoring other values. */
export function textOf(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** The workspace-local calendar date as `YYYY-MM-DD`. */
export function localDate(timeZone: string, ms: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ms)
  const part = (type: string): string => parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

interface WallClock {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly hour: number
  readonly minute: number
  readonly second: number
}

function wallClock(timeZone: string, ms: number): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms)
  const read = (type: string): number => Number(parts.find((entry) => entry.type === type)?.value ?? '0')
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

/** The instant the workspace-local day containing `ms` starts, in epoch milliseconds. */
export function startOfLocalDay(timeZone: string, ms: number): number {
  const clock = wallClock(timeZone, ms)
  const utcMidnight = Date.UTC(clock.year, clock.month - 1, clock.day)
  const asUtc = wallClock(timeZone, utcMidnight)
  const offset = Date.UTC(asUtc.year, asUtc.month - 1, asUtc.day, asUtc.hour, asUtc.minute, asUtc.second) - utcMidnight
  return utcMidnight - offset
}

/** An ISO timestamp, the form Payload stores for `createdAt` and compares in a date query. */
export const iso = (ms: number): string => new Date(ms).toISOString()

/** Tells the operator that a read hit its bound and some records wait for a later run. */
export function warnTruncated(trigger: string, count: number): void {
  if (count >= READ_LIMIT) console.warn('[automation.rules] read limit reached', { trigger, count })
}

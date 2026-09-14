/* eslint-disable complexity, sonarjs/cognitive-complexity -- timezone and cursor helpers encode state-machine edge cases. */
import type { Id } from '@ops/kernel'
import type { NotificationStore } from '@ops/platform'
import type { CronWindow } from './cron-job'
import { localDateFormatter } from './local-date'
import type { JobBatch, JobCursor, JobTarget, ScheduledJobsDeps } from './jobs'

export const JOB_LIMIT = 200
export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

export function jobWindow(job: string, window: CronWindow): string {
  return `${job}:${String(window.start)}`
}

export function localDate(timeZone: string, ms: number): string {
  return localDateFormatter(timeZone)(ms)
}

function localParts(timeZone: string, ms: number): { readonly date: string; readonly minutes: number } {
  const parts = new Map(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ms)
      .map((part) => [part.type, part.value]),
  )
  const date = `${parts.get('year') ?? ''}-${parts.get('month') ?? ''}-${parts.get('day') ?? ''}`
  const hour = Number(parts.get('hour') ?? 0)
  const minute = Number(parts.get('minute') ?? 0)
  return { date, minutes: hour * 60 + minute }
}

export function localMinutes(timeZone: string, ms: number): number {
  return localParts(timeZone, ms).minutes
}

/** Finds tenant-local midnight, including DST transitions. */
export function startOfLocalDay(timeZone: string, ms: number): number {
  const date = localDate(timeZone, ms)
  const [year, month, day] = date.split('-').map(Number)
  const dayMs = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  let candidate = dayMs
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = localParts(timeZone, candidate)
    const [actualYear, actualMonth, actualDay] = actual.date.split('-').map(Number)
    const rendered = Date.UTC(
      actualYear ?? 1970,
      (actualMonth ?? 1) - 1,
      actualDay ?? 1,
      Math.floor(actual.minutes / 60),
      actual.minutes % 60,
    )
    const delta = dayMs - rendered
    if (delta === 0) return candidate
    candidate += delta
  }
  return candidate
}

export function firstRunAfterNine(timeZone: string, window: CronWindow): boolean {
  const before = localParts(timeZone, window.start)
  const after = localParts(timeZone, window.end)
  return before.date === after.date && before.minutes < 9 * 60 && after.minutes >= 9 * 60
}

export function localDateChanged(timeZone: string, window: CronWindow): boolean {
  return localParts(timeZone, window.start).date !== localParts(timeZone, window.end).date
}

export function asBatch<T>(value: readonly T[] | JobBatch<T> | undefined): JobBatch<T> {
  if (value === undefined) return { rows: [] }
  if (typeof value === 'object' && 'rows' in value) return value
  return { rows: [...value] }
}

function cursorOf(row: unknown): JobCursor {
  if (typeof row !== 'object' || row === null) return { id: '', updatedAt: 0 }
  const value = row as Record<string, unknown>
  const record = value['record']
  let id = typeof value['id'] === 'string' ? value['id'] : ''
  if (id === '' && typeof record === 'object' && record !== null && 'id' in record && typeof record.id === 'string')
    id = record.id
  let updatedAt = 0
  if (typeof value['updatedAt'] === 'number') updatedAt = value['updatedAt']
  else if (typeof value['expiresAt'] === 'number') updatedAt = value['expiresAt']
  return { id, updatedAt }
}

export async function claim(deps: ScheduledJobsDeps, name: string, window: CronWindow): Promise<boolean> {
  return deps.runs === undefined || (await deps.runs.claim(name, jobWindow(name, window)))
}

export async function cursorOfJob(deps: ScheduledJobsDeps, name: string): Promise<JobCursor | undefined> {
  return deps.runs?.getCursor?.(name)
}

export async function saveCursor(input: {
  readonly deps: ScheduledJobsDeps
  readonly name: string
  readonly rows: readonly unknown[]
  readonly next?: JobCursor | undefined
}): Promise<void> {
  if (input.deps.runs?.saveCursor === undefined) return
  const limit = input.deps.limit ?? JOB_LIMIT
  const cursor = input.rows.length >= limit ? (input.next ?? cursorOf(input.rows[input.rows.length - 1])) : undefined
  await input.deps.runs.saveCursor(input.name, cursor)
}

export async function notificationCount(input: {
  readonly targets: readonly JobTarget[]
  readonly type: 'overdue' | 'digest' | 'stalled'
  readonly date: string
  readonly notifications: NotificationStore
  readonly digestMinutes?: number
}): Promise<{ readonly created: number; readonly skipped: number }> {
  let created = 0
  let attempted = 0
  for (const target of input.targets) {
    if (!digestIsDue(input, target)) continue
    const recipients = target.assigneeIds ?? recipientsOf(target)
    for (const userId of recipients) {
      attempted += 1
      const dedupeKey =
        input.type === 'digest'
          ? `${userId}:digest:${input.date}`
          : recordDedupeKey({ target, type: input.type, date: input.date, userId })
      const result = await input.notifications.insertIfAbsent({
        userId,
        type: input.type,
        dedupeKey,
        record: target.record,
        data: { title: target.title },
      })
      if (result === 'created') created += 1
    }
  }
  return { created, skipped: attempted - created }
}

function recipientsOf(target: JobTarget): readonly Id[] {
  return target.ownerId === undefined ? [] : [target.ownerId]
}

function recordDedupeKey(input: {
  readonly target: JobTarget
  readonly type: string
  readonly date: string
  readonly userId: string
}): string {
  return `${input.target.record.type}:${input.target.record.id}:${input.type}:${input.date}:${input.userId}`
}

function digestIsDue(
  input: { readonly type: 'overdue' | 'digest' | 'stalled'; readonly digestMinutes?: number },
  target: JobTarget,
): boolean {
  if (input.type !== 'digest' || target.digestLocalTime === undefined || input.digestMinutes === undefined) return true
  return digestMinutes(target.digestLocalTime) <= input.digestMinutes
}

function digestMinutes(value: string): number {
  const [hour, minute] = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':').map(Number) : [0, 0]
  return (hour ?? 0) * 60 + (minute ?? 0)
}

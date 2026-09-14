/* eslint-disable max-lines-per-function, max-statements, max-params, @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/restrict-template-expressions -- fixture helpers exercise continuation protocol across all jobs. */
import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { CronWindow } from '../../src/cron/cron-job'
import { createDueSoonJob, type DueItem } from '../../src/cron/due-soon'
import {
  createDigestJob,
  createIntakeCleanupJob,
  createInvitationsExpireJob,
  createOverdueJob,
  createStalledJob,
  type JobBatch,
  type JobCursor,
  type JobSources,
  type JobTarget,
  type ScheduledJobsDeps,
} from '../../src/cron/jobs'
import { InMemoryNotificationStore } from './in-memory-notification-store'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const NEW_YORK_09 = Date.UTC(2026, 8, 14, 13, 0)

function windowAt(end: number): CronWindow {
  return { start: end - 15 * MINUTE, end }
}

function cursorAfter<
  T extends {
    readonly updatedAt?: number
    readonly expiresAt?: number
    readonly id?: string
    readonly record?: { readonly id: string }
  },
>(rows: readonly T[]): JobCursor | undefined {
  const row = rows[rows.length - 1]
  if (row === undefined) return undefined
  return {
    updatedAt: row.updatedAt ?? row.expiresAt ?? 0,
    id: row.id ?? row.record?.id ?? '',
  }
}

function page<
  T extends {
    readonly updatedAt?: number
    readonly expiresAt?: number
    readonly id?: string
    readonly record?: { readonly id: string }
  },
>(rows: readonly T[], limit: number, cursor: JobCursor | undefined): JobBatch<T> {
  const eligible = rows.filter((row) => {
    const current = cursorAfter([row])
    return (
      cursor === undefined ||
      current === undefined ||
      current.updatedAt > cursor.updatedAt ||
      (current.updatedAt === cursor.updatedAt && current.id > cursor.id)
    )
  })
  const selected = eligible.slice(0, limit)
  const result: JobBatch<T> = { rows: selected }
  if (selected.length === limit && eligible.length > limit) {
    const nextCursor = cursorAfter(selected)
    return nextCursor === undefined ? result : { ...result, nextCursor }
  }
  return result
}

function runs() {
  const claimed = new Set<string>()
  const cursors = new Map<string, JobCursor | undefined>()
  return {
    claim: async (job: string, window: string) => {
      const key = `${job}:${window}`
      if (claimed.has(key)) return false
      claimed.add(key)
      return true
    },
    getCursor: async (job: string) => cursors.get(job),
    saveCursor: async (job: string, cursor: JobCursor | undefined) => {
      cursors.set(job, cursor)
    },
  }
}

function targets(count: number): JobTarget[] {
  return Array.from({ length: count }, (_, index) => ({
    record: { type: 'lead', id: asId(`lead-${String(index).padStart(3, '0')}`) },
    title: `Lead ${index}`,
    ownerId: asId('owner-1'),
    updatedAt: index,
  }))
}

function deps(source: JobSources, limit = 200): ScheduledJobsDeps {
  return { source, notifications: new InMemoryNotificationStore(), runs: runs(), timeZone: 'America/New_York', limit }
}

describe('scheduled job windows and continuation', () => {
  it('uses tenant-local midnight and fires overdue/stalled on the first run after 09:00', async () => {
    const calls: number[] = []
    const source: JobSources = {
      listOverdue: (before) => {
        calls.push(before)
        return Promise.resolve({ rows: [] })
      },
      listStalled: (before) => {
        calls.push(before)
        return Promise.resolve({ rows: [] })
      },
    }
    const overdue = createOverdueJob(deps(source))
    const stalled = createStalledJob(deps(source))
    const window = windowAt(NEW_YORK_09)
    expect(overdue.isDue?.(window)).toBe(true)
    expect(stalled.isDue?.(window)).toBe(true)
    await overdue.run(window)
    await stalled.run(window)
    expect(calls[0]).toBe(Date.UTC(2026, 8, 14, 4, 0))
    expect(calls[1]).toBe(Date.UTC(2026, 8, 14, 4, 0))
  })

  it('continues capped pages for each job and keeps same-window reruns idempotent', async () => {
    const rows = targets(250)
    const notificationRows = new InMemoryNotificationStore()
    const source: JobSources = {
      listOverdue: (_before, limit, cursor) => Promise.resolve(page(rows, limit, cursor)),
      listDigests: (_date, _at, limit, cursor) => Promise.resolve(page(rows, limit, cursor)),
      listStalled: (_before, limit, cursor) => Promise.resolve(page(rows, limit, cursor)),
      listExpiredInvitations: (_at, limit, cursor) =>
        Promise.resolve(
          page(
            rows.map((row) => ({ id: row.record.id, expiresAt: row.updatedAt ?? 0 })),
            limit,
            cursor,
          ),
        ),
      deleteRejected: (_before, limit, cursor) =>
        Promise.resolve(
          page(
            rows.map((row) => ({ id: row.record.id, updatedAt: row.updatedAt ?? 0 })),
            limit,
            cursor,
          ),
        ),
    }
    const makeDeps = (name: string): ScheduledJobsDeps => ({
      ...deps(source, 200),
      notifications: notificationRows,
      runs: runs(),
      timeZone: name === 'utc' ? 'UTC' : 'America/New_York',
      limit: 200,
    })
    const window = windowAt(NEW_YORK_09)
    const jobs = [
      createInvitationsExpireJob(makeDeps('utc')),
      createOverdueJob(makeDeps('ny')),
      createDigestJob(makeDeps('ny')),
      createStalledJob(makeDeps('ny')),
    ]
    for (const job of jobs) {
      const first = await job.run(window)
      const duplicate = await job.run(window)
      const next = await job.run(windowAt(NEW_YORK_09 + 15 * MINUTE))
      expect(first.ok).toBe(true)
      expect(duplicate).toMatchObject({ ok: true, value: { processed: 0 } })
      expect(next.ok).toBe(true)
    }
    const cleanupDeps = makeDeps('utc')
    const cleanup = createIntakeCleanupJob(cleanupDeps)
    const midnight = windowAt(Date.UTC(2026, 8, 15, 0, 0))
    expect(cleanup.isDue?.(midnight)).toBe(true)
    const first = await cleanup.run(midnight)
    const second = await cleanup.run(windowAt(midnight.end + 15 * MINUTE))
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.value).toMatchObject({ processed: 200 })
      expect(second.value).toMatchObject({ processed: 50 })
    }
  })

  it('continues more than 200 due-soon records with a persisted cursor', async () => {
    const items: DueItem[] = Array.from({ length: 250 }, (_, index) => ({
      record: { type: 'task', id: asId(`task-${String(index).padStart(3, '0')}`) },
      title: `Task ${index}`,
      assigneeIds: [asId('owner-1')],
      dueAt: NEW_YORK_09 + HOUR,
      updatedAt: index,
    }))
    const notificationRows = new InMemoryNotificationStore()
    const state = runs()
    const source = {
      listDueWithin: async (_from: number, _to: number, limit: number, cursor?: JobCursor) =>
        page(items, limit, cursor).rows,
    }
    const job = createDueSoonJob({
      source,
      notifications: notificationRows,
      timeZone: 'America/New_York',
      runs: state,
      limit: 200,
    })
    const first = await job.run(windowAt(NEW_YORK_09))
    const second = await job.run(windowAt(NEW_YORK_09 + 15 * MINUTE))
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.value).toMatchObject({ processed: 200, created: 200 })
      expect(second.value).toMatchObject({ processed: 50, created: 50 })
    }
  })
})

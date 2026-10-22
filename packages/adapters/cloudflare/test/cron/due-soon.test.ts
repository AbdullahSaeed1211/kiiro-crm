import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { CronWindow } from '../../src/cron/cron-job'
import {
  createDueSoonJob,
  DUE_SOON_HORIZON_MS,
  DUE_SOON_LIMIT,
  type DueItem,
  type DueItemSource,
} from '../../src/cron/due-soon'
import { InMemoryNotificationStore } from './in-memory-notification-store'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const RUN_AT = Date.UTC(2026, 8, 13, 12, 0)
const NEW_YORK = 'America/New_York'
const SCHEDULE_JOB = 'sales.scheduleReminders'
const SOURCE_FAILURE = 'temporary source failure'

function windowEnding(end: number): CronWindow {
  return { start: end - 15 * MINUTE, end }
}

function dueItem(id: string, dueAt: number, assignees: readonly string[]): DueItem {
  return { record: { type: 'task', id: asId(id) }, title: `Item ${id}`, assigneeIds: assignees.map(asId), dueAt }
}

function sourceOf(items: readonly DueItem[]) {
  const calls: (readonly [number, number, number])[] = []
  const source: DueItemSource = {
    listDueWithin: (fromMs, toMs, limit) => {
      calls.push([fromMs, toMs, limit])
      return Promise.resolve(items.filter((item) => item.dueAt >= fromMs && item.dueAt < toMs).slice(0, limit))
    },
  }
  return { source, calls }
}

// eslint-disable-next-line max-lines-per-function -- the job behaviors share a small in-memory fixture and verification shape.
describe('createDueSoonJob', () => {
  it('creates exactly one notification per assignee when run twice', async () => {
    const store = new InMemoryNotificationStore()
    const items = [dueItem('i-1', RUN_AT + 3 * HOUR, ['u-1', 'u-2']), dueItem('i-2', RUN_AT + 20 * HOUR, ['u-1'])]
    const job = createDueSoonJob({ source: sourceOf(items).source, notifications: store, timeZone: NEW_YORK })
    const first = await job.run(windowEnding(RUN_AT))
    const second = await job.run(windowEnding(RUN_AT + 15 * MINUTE))
    expect(first).toEqual({ ok: true, value: { processed: 2, created: 3, skipped: 0 } })
    expect(second).toEqual({ ok: true, value: { processed: 2, created: 0, skipped: 3 } })
    expect([...store.rows.values()].map((row) => [row.userId, row.type, row.record?.id])).toEqual([
      ['u-1', 'due_soon', 'i-1'],
      ['u-2', 'due_soon', 'i-1'],
      ['u-1', 'due_soon', 'i-2'],
    ])
  })

  it('asks the source for items due within the next 24 hours, at most 200', async () => {
    const { source, calls } = sourceOf([dueItem('late', RUN_AT + 25 * HOUR, ['u-1'])])
    const store = new InMemoryNotificationStore()
    const outcome = await createDueSoonJob({ source, notifications: store, timeZone: 'UTC' }).run(windowEnding(RUN_AT))
    expect(calls).toEqual([[RUN_AT, RUN_AT + DUE_SOON_HORIZON_MS, DUE_SOON_LIMIT]])
    expect(outcome).toEqual({ ok: true, value: { processed: 0, created: 0, skipped: 0 } })
  })

  it('keeps schedule reminders distinct by schedule row and exact start time', async () => {
    const store = new InMemoryNotificationStore()
    const schedule = (startsAt: number): DueItem => ({
      record: { type: 'lead', id: asId('lead-1') },
      title: 'Callback title',
      assigneeIds: [asId('u-1')],
      dueAt: startsAt,
      updatedAt: RUN_AT,
      dedupeId: 'schedule-1',
      dedupeAt: startsAt,
      notificationData: { schedule: { id: 'schedule-1', kind: 'callback', startsAt } },
    })
    const job = createDueSoonJob({
      name: SCHEDULE_JOB,
      source: sourceOf([schedule(RUN_AT + HOUR)]).source,
      notifications: store,
      timeZone: NEW_YORK,
    })
    await job.run(windowEnding(RUN_AT))
    const moved = createDueSoonJob({
      name: SCHEDULE_JOB,
      source: sourceOf([schedule(RUN_AT + 2 * HOUR)]).source,
      notifications: store,
      timeZone: NEW_YORK,
    })
    await moved.run(windowEnding(RUN_AT + MINUTE))

    expect(job.name).toBe(SCHEDULE_JOB)
    expect([...store.rows.keys()]).toEqual([
      `lead:schedule-1:due_soon:2026-09-13:${String(RUN_AT + HOUR)}:u-1`,
      `lead:schedule-1:due_soon:2026-09-13:${String(RUN_AT + 2 * HOUR)}:u-1`,
    ])
    expect([...store.rows.values()][0]?.data).toMatchObject({ schedule: { id: 'schedule-1', kind: 'callback' } })
  })

  it('claims each custom job window once and persists its schedule cursor under its own name', async () => {
    const store = new InMemoryNotificationStore()
    const claims = new Set<string>()
    const cursorReads: string[] = []
    const savedCursors: (readonly [string, { id: string; updatedAt: number } | undefined])[] = []
    const runs = {
      claim: (name: string, window: string) => {
        const key = `${name}:${window}`
        if (claims.has(key)) return Promise.resolve(false)
        claims.add(key)
        return Promise.resolve(true)
      },
      getCursor: (name: string) => {
        cursorReads.push(name)
        return Promise.resolve(undefined)
      },
      saveCursor: (name: string, cursor: { id: string; updatedAt: number } | undefined) => {
        savedCursors.push([name, cursor])
        return Promise.resolve()
      },
    }
    const reminder: DueItem = {
      ...dueItem('lead-1', RUN_AT + HOUR, ['u-1']),
      dedupeId: 'schedule-row-1',
      updatedAt: RUN_AT,
    }
    const job = createDueSoonJob({
      name: SCHEDULE_JOB,
      source: sourceOf([reminder]).source,
      notifications: store,
      timeZone: NEW_YORK,
      runs,
      limit: 1,
    })
    const outcomes = await Promise.all([job.run(windowEnding(RUN_AT)), job.run(windowEnding(RUN_AT))])

    expect(outcomes.reduce((total, result) => total + (result.ok ? result.value.processed : 0), 0)).toBe(1)
    expect(outcomes.reduce((total, result) => total + (result.ok ? result.value.created : 0), 0)).toBe(1)
    expect(cursorReads).toEqual([SCHEDULE_JOB])
    expect(savedCursors).toEqual([[SCHEDULE_JOB, { id: 'schedule-row-1', updatedAt: RUN_AT }]])
  })

  it('keeps the last completed cursor after a failed source read and retries on the next window', async () => {
    const priorCursor = { id: 'schedule-before', updatedAt: RUN_AT - HOUR }
    const cursorReads: (typeof priorCursor | undefined)[] = []
    const savedCursors: ({ id: string; updatedAt: number } | undefined)[] = []
    const sourceCalls: number[] = []
    let attempts = 0
    const job = createDueSoonJob({
      name: SCHEDULE_JOB,
      source: {
        // eslint-disable-next-line max-params -- mirrors the four-argument DueItemSource pagination contract.
        listDueWithin: (_from, _to, _limit, cursor) => {
          sourceCalls.push(attempts)
          attempts += 1
          if (attempts === 1) return Promise.reject(new Error(SOURCE_FAILURE))
          return Promise.resolve(cursor === undefined ? [dueItem('missed-cursor', RUN_AT + HOUR, [])] : [])
        },
      },
      notifications: new InMemoryNotificationStore(),
      timeZone: NEW_YORK,
      runs: {
        claim: () => Promise.resolve(true),
        getCursor: () => {
          cursorReads.push(priorCursor)
          return Promise.resolve(priorCursor)
        },
        saveCursor: (_name, cursor) => {
          savedCursors.push(cursor)
          return Promise.resolve()
        },
      },
    })

    await expect(job.run(windowEnding(RUN_AT))).rejects.toThrow(SOURCE_FAILURE)
    expect(await job.run(windowEnding(RUN_AT + MINUTE))).toEqual({
      ok: true,
      value: { processed: 0, created: 0, skipped: 0 },
    })
    expect(sourceCalls).toEqual([0, 1])
    expect(cursorReads).toEqual([priorCursor, priorCursor])
    expect(savedCursors).toEqual([undefined])
  })
})

describe('createDueSoonJob time zone handling', () => {
  // 03:30 UTC on 14 Sep is 23:30 on 13 Sep in New York, so the tenant's due date differs from the UTC date.
  const dueAt = Date.UTC(2026, 8, 14, 3, 30)

  async function keysFor(timeZone: string, runs: readonly number[]): Promise<string[]> {
    const store = new InMemoryNotificationStore()
    const job = createDueSoonJob({
      source: sourceOf([dueItem('i-9', dueAt, ['u-7'])]).source,
      notifications: store,
      timeZone,
    })
    for (const runAt of runs) await job.run(windowEnding(runAt))
    return [...store.rows.keys()]
  }

  it('puts the due date in the tenant time zone into the dedupe key', async () => {
    expect(await keysFor(NEW_YORK, [RUN_AT])).toEqual(['task:i-9:due_soon:2026-09-13:u-7'])
    expect(await keysFor('UTC', [RUN_AT])).toEqual(['task:i-9:due_soon:2026-09-14:u-7'])
  })

  it('creates nothing new when runs fall on both sides of UTC midnight', async () => {
    const beforeMidnight = Date.UTC(2026, 8, 13, 23, 50)
    const afterMidnight = Date.UTC(2026, 8, 14, 0, 5)
    expect(await keysFor(NEW_YORK, [beforeMidnight, afterMidnight])).toEqual(['task:i-9:due_soon:2026-09-13:u-7'])
  })
})

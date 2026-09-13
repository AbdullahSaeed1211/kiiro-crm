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

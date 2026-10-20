import type { Actor } from '@ops/platform'
import type { WorkTaskRecord } from '../ports/work'
import { dueDay, todayIn } from '../domain/due-dates'
import { TERMINAL_CATEGORIES } from '../domain/rules'

export interface MyTaskBuckets {
  readonly overdue: readonly WorkTaskRecord[]
  readonly today: readonly WorkTaskRecord[]
  readonly next7Days: readonly WorkTaskRecord[]
  readonly later: readonly WorkTaskRecord[]
  readonly noDueDate: readonly WorkTaskRecord[]
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  const result = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1))
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function bucketFor(due: string, today: string, nextWeek: string): keyof MyTaskBuckets {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return due < nextWeek ? 'next7Days' : 'later'
}

function isAssignedOpen(task: WorkTaskRecord, actorId: Actor['id']): boolean {
  return !TERMINAL_CATEGORIES.has(task.stageCategory) && task.assigneeIds.includes(actorId)
}

/** Buckets open assigned tasks by calendar date: today in the tenant timezone against each task's stored due date. */
export function myTasksBuckets(input: {
  readonly tasks: readonly WorkTaskRecord[]
  readonly actor: Pick<Actor, 'id'>
  readonly timeZone: string
  readonly now: number
}): MyTaskBuckets {
  const { tasks, actor, timeZone, now } = input
  const today = todayIn(now, timeZone)
  const nextWeek = addDays(today, 7)
  const buckets: Record<keyof MyTaskBuckets, WorkTaskRecord[]> = {
    overdue: [],
    today: [],
    next7Days: [],
    later: [],
    noDueDate: [],
  }
  for (const task of tasks) {
    if (!isAssignedOpen(task, actor.id)) continue
    if (task.dueAt === null) {
      buckets.noDueDate.push(task)
      continue
    }
    const due = dueDay(task.dueAt)
    buckets[bucketFor(due, today, nextWeek)].push(task)
  }
  for (const bucket of Object.values(buckets))
    bucket.sort(
      (a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id),
    )
  return buckets
}

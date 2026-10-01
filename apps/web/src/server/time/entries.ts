import { isManagerUp } from '@ops/platform'
import { payloadData } from '../auth/api'
import type { ProductContext } from '../auth/context'
import { loadPeople } from '../people'

const MAX_ROWS = 200

/** One logged stretch of work. */
export interface TimeEntry {
  readonly id: string
  readonly userId: string
  readonly person: string
  readonly minutes: number
  readonly day: number
  readonly note: string
  /** Whether the signed-in user may delete it: its author, or an owner or manager. */
  readonly canDelete: boolean
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const num = (value: unknown): number => (typeof value === 'number' ? value : 0)
const refId = (value: unknown): string =>
  typeof value === 'object' && value !== null ? text((value as { id?: unknown }).id) : text(value)

/** True when the signed-in user can open the task, which is what lets them see or log its time. */
async function canSeeTask(context: ProductContext, taskId: string): Promise<boolean> {
  try {
    await context.payload.findByID({
      collection: 'tasks',
      id: taskId,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    return true
  } catch {
    return false
  }
}

/** The time logged on a task, newest day first; empty when the user cannot open the task. */
export async function listTaskTime(context: ProductContext, taskId: string): Promise<TimeEntry[]> {
  if (!(await canSeeTask(context, taskId))) return []
  const found = await payloadData(context.payload).find({
    collection: 'timeEntries',
    where: { task: { equals: taskId } },
    sort: '-day',
    limit: MAX_ROWS,
    depth: 0,
    overrideAccess: true,
  })
  const rows = found.docs.flatMap((doc) => (doc === undefined ? [] : [doc]))
  const people = await loadPeople(
    context,
    rows.map((row) => refId(row.user)),
  )
  const me = String(context.user.id)
  return rows.map((row) => {
    const userId = refId(row.user)
    return {
      id: String(row.id),
      userId,
      person: people.get(userId)?.name ?? 'Someone',
      minutes: num(row.minutes),
      day: num(row.day),
      note: text(row.note),
      canDelete: userId === me || isManagerUp(context.actor),
    }
  })
}

/** Logs time on a task for the signed-in user; false when they cannot open the task. */
export async function addTaskTime(
  context: ProductContext,
  entry: { readonly taskId: string; readonly minutes: number; readonly day: number; readonly note: string },
): Promise<boolean> {
  if (!(await canSeeTask(context, entry.taskId))) return false
  await payloadData(context.payload).create({
    collection: 'timeEntries',
    data: {
      task: entry.taskId,
      user: String(context.user.id),
      minutes: entry.minutes,
      day: entry.day,
      note: entry.note === '' ? null : entry.note,
    },
    depth: 0,
    overrideAccess: true,
  })
  return true
}

/** Deletes an entry its author or a manager chose; false when it is not theirs to delete. */
export async function removeTaskTime(context: ProductContext, entryId: string): Promise<boolean> {
  const found = await payloadData(context.payload).find({
    collection: 'timeEntries',
    where: { id: { equals: entryId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = found.docs[0]
  if (row === undefined) return false
  if (refId(row.user) !== String(context.user.id) && !isManagerUp(context.actor)) return false
  await payloadData(context.payload).delete({ collection: 'timeEntries', id: entryId, overrideAccess: true })
  return true
}

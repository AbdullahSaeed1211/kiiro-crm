/* eslint-disable max-params -- the source signature mirrors the cloudflare due-item read port. */
import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'
import { createLocalReq, type Payload, type TypedUser, type Where } from 'payload'
import { canReadParentReference } from '../collections/collaboration/fields'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, msOf, numberOf, textOf, type Doc } from './documents'

interface JobCursor {
  readonly id: string
  readonly updatedAt: number
}

interface ScheduleReminder {
  readonly record: RecordRef
  readonly title: string
  readonly assigneeIds: readonly Id[]
  readonly dueAt: number
  readonly updatedAt: number
  readonly dedupeId: string
  readonly dedupeAt: number
  readonly notificationData: Readonly<Record<string, unknown>>
}

interface ScheduleReminderSource {
  listDueWithin(fromMs: number, toMs: number, limit: number, cursor?: JobCursor): Promise<readonly ScheduleReminder[]>
}

interface ScheduleWindow {
  readonly fromMs: number
  readonly toMs: number
}

function scheduleWhere({ fromMs, toMs }: ScheduleWindow, cursor?: JobCursor): Where {
  const clauses: Where[] = [
    { startsAt: { greater_than_equal: fromMs } },
    { startsAt: { less_than: toMs } },
    { status: { equals: 'scheduled' } },
    { assignees: { exists: true } },
  ]
  if (cursor !== undefined) {
    const timestamp = new Date(cursor.updatedAt).toISOString()
    clauses.push({
      or: [
        { updatedAt: { greater_than: timestamp } },
        { and: [{ updatedAt: { equals: timestamp } }, { id: { greater_than: cursor.id } }] },
      ],
    })
  }
  return { and: clauses }
}

function afterCursor(updatedAt: number, id: string, cursor: JobCursor | undefined): boolean {
  return cursor === undefined || updatedAt > cursor.updatedAt || (updatedAt === cursor.updatedAt && id > cursor.id)
}

function supportedSchedule(input: {
  readonly recordType: unknown
  readonly kind: unknown
  readonly status: unknown
}): boolean {
  return (
    (input.recordType === 'lead' || input.recordType === 'contact') &&
    (input.kind === 'callback' || input.kind === 'appointment') &&
    input.status === 'scheduled'
  )
}

interface ScheduleIdentityFields {
  readonly id: Id | undefined
  readonly recordId: Id | undefined
  readonly recordType: unknown
  readonly kind: unknown
  readonly status: unknown
  readonly updatedAt: number | undefined
  readonly assigneeIds: readonly Id[]
}

interface ValidScheduleIdentity extends ScheduleIdentityFields {
  readonly id: Id
  readonly recordId: Id
  readonly recordType: 'lead' | 'contact'
  readonly kind: 'callback' | 'appointment'
  readonly status: 'scheduled'
  readonly updatedAt: number
}

function validScheduleIdentity(input: ScheduleIdentityFields): input is ValidScheduleIdentity {
  return (
    input.id !== undefined && input.recordId !== undefined && supportedSchedule(input) && input.updatedAt !== undefined
  )
}

function inWindow(startsAt: number | null, window: ScheduleWindow): startsAt is number {
  return startsAt !== null && startsAt >= window.fromMs && startsAt < window.toMs
}

function toReminder(doc: Doc, window: ScheduleWindow, cursor: JobCursor | undefined): ScheduleReminder | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const recordId = idOf(fieldOf(doc, 'recordId'))
  const recordType = fieldOf(doc, 'recordType')
  const kind = fieldOf(doc, 'kind')
  const status = fieldOf(doc, 'status')
  const startsAt = numberOf(doc, 'startsAt')
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  const assigneeIds = idsOf(fieldOf(doc, 'assignees'))
  const fields = { id, recordId, recordType, kind, status, updatedAt, assigneeIds }
  if (
    !validScheduleIdentity(fields) ||
    !inWindow(startsAt, window) ||
    !afterCursor(fields.updatedAt, String(fields.id), cursor)
  )
    return undefined

  const requestedTitle = textOf(doc, 'title')?.trim()
  const title = requestedTitle ?? ''
  return {
    record: { type: fields.recordType, id: fields.recordId },
    title,
    assigneeIds,
    dueAt: startsAt,
    updatedAt: fields.updatedAt,
    dedupeId: String(fields.id),
    dedupeAt: startsAt,
    notificationData: { schedule: { id: String(fields.id), kind: fields.kind, startsAt } },
  }
}

async function activeScheduleUsers(
  payload: Payload,
  reminders: readonly ScheduleReminder[],
): Promise<Map<string, Doc>> {
  const ids = [...new Set(reminders.flatMap((reminder) => reminder.assigneeIds))]
  if (ids.length === 0) return new Map()
  const users = await payload.find({
    collection: COLLECTIONS.users,
    where: { and: [{ id: { in: ids } }, { active: { equals: true } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const userById = new Map(
    users.docs.flatMap((user) => {
      const id = idOf(fieldOf(user, 'id'))
      return id === undefined || fieldOf(user, 'active') !== true ? [] : [[String(id), user] as const]
    }),
  )
  return userById
}

function parentReadForAssignee(
  payload: Payload,
  userById: ReadonlyMap<string, Doc>,
  reminder: ScheduleReminder,
  userId: Id,
): Promise<boolean> {
  const user = userById.get(String(userId))
  if (user === undefined) return Promise.resolve(false)
  return createLocalReq({ user: user as TypedUser }, payload).then((req) =>
    canReadParentReference(req, { recordType: reminder.record.type, recordId: String(reminder.record.id) }),
  )
}

async function reminderWithVisibleAssignees(
  payload: Payload,
  reminder: ScheduleReminder,
  userById: ReadonlyMap<string, Doc>,
  allowedByUserAndRecord: Map<string, Promise<boolean>>,
): Promise<ScheduleReminder> {
  const canAssigneeRead = (userId: Id): Promise<boolean> => {
    const key = `${userId}:${reminder.record.type}:${reminder.record.id}`
    const existing = allowedByUserAndRecord.get(key)
    if (existing !== undefined) return existing
    const answer = parentReadForAssignee(payload, userById, reminder, userId)
    allowedByUserAndRecord.set(key, answer)
    return answer
  }
  const assigneeIds = await Promise.all(
    reminder.assigneeIds.map(async (id) => ((await canAssigneeRead(id)) ? id : undefined)),
  )
  return { ...reminder, assigneeIds: assigneeIds.filter((id): id is Id => id !== undefined) }
}

async function visibleAssignees(
  payload: Payload,
  reminders: readonly ScheduleReminder[],
): Promise<readonly ScheduleReminder[]> {
  const userById = await activeScheduleUsers(payload, reminders)
  const allowedByUserAndRecord = new Map<string, Promise<boolean>>()
  const results = await Promise.all(
    reminders.map((reminder) => reminderWithVisibleAssignees(payload, reminder, userById, allowedByUserAndRecord)),
  )
  return results
}

/** Upcoming sales callbacks and appointments, addressed only to each schedule's stored assignees. */
export function createScheduleDueItemSource(payload: Payload): ScheduleReminderSource {
  return {
    listDueWithin: async (fromMs, toMs, limit, cursor) => {
      if (limit <= 0) return []
      const window = { fromMs, toMs }
      const page = await payload.find({
        collection: COLLECTIONS.scheduleItems,
        where: scheduleWhere(window, cursor),
        sort: ['updatedAt', 'id'],
        limit,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const reminders = page.docs.flatMap((doc) => {
        const reminder = toReminder(doc, window, cursor)
        return reminder === undefined ? [] : [reminder]
      })
      return visibleAssignees(payload, reminders)
    },
  }
}

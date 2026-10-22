import { asId, type Id } from '@ops/kernel'
import type { MonthlyDesignConfig, TaskDraft } from '@ops/module-work'
import { createLocalReq, type Payload, type TypedUser } from 'payload'
import { canReadParentReference } from '../collections/collaboration/fields'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, type Doc } from './documents'
import { createNotificationStore } from './notification-store'

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function monthlyOrigin(doc: Doc): { readonly projectId: string; readonly issueMonth: string } | undefined {
  const customData = objectValue(fieldOf(doc, 'customData'))
  const origin = objectValue(customData?.['monthlyOrigin'])
  const projectId = origin?.['projectId']
  const issueMonth = origin?.['issueMonth']
  return typeof projectId === 'string' && typeof issueMonth === 'string' ? { projectId, issueMonth } : undefined
}

async function findTask(payload: Payload, monthlyOccurrenceKey: string): Promise<Doc | undefined> {
  const found = await payload.find({
    collection: COLLECTIONS.tasks,
    where: { monthlyOccurrenceKey: { equals: monthlyOccurrenceKey } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    trash: true,
  })
  return found.docs[0]
}

function createSystemTask(payload: Payload, draft: TaskDraft): Promise<Doc> {
  return payload.create({
    collection: COLLECTIONS.tasks,
    data: {
      monthlyOccurrenceKey: draft.monthlyOccurrenceKey,
      title: draft.title,
      project: draft.projectId,
      workflow: draft.workflowId,
      stageId: draft.stageId,
      rank: '000000000001',
      priority: 'none',
      repeat: 'none',
      assignees: [...(draft.assigneeIds ?? [])],
      dueAt: draft.dueAt,
      customData: { monthlyOrigin: draft.monthlyOrigin },
    },
    overrideAccess: true,
  })
}

async function readableActiveAssignees(payload: Payload, task: Doc): Promise<readonly Id[]> {
  const ids = idsOf(fieldOf(task, 'assignees'))
  const taskId = idOf(fieldOf(task, 'id'))
  if (ids.length === 0 || taskId === undefined) return []
  const active = await payload.find({
    collection: COLLECTIONS.users,
    where: { and: [{ id: { in: ids } }, { active: { equals: true } }] },
    limit: ids.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const users = new Map(
    active.docs.flatMap((user) => {
      const id = idOf(fieldOf(user, 'id'))
      return id === undefined || fieldOf(user, 'active') !== true ? [] : [[String(id), user] as const]
    }),
  )
  const visible = await Promise.all(
    ids.map(async (id) => {
      const user = users.get(String(id))
      if (user === undefined) return undefined
      const req = await createLocalReq({ user: user as TypedUser }, payload)
      return (await canReadParentReference(req, { recordType: 'task', recordId: String(taskId) })) ? id : undefined
    }),
  )
  return visible.filter((id): id is Id => id !== undefined)
}

function matchesOrigin(doc: Doc, projectId: string, issueMonth: string): boolean {
  const origin = monthlyOrigin(doc)
  return origin?.projectId === projectId && origin.issueMonth === issueMonth
}

function recoveredTask(
  doc: Doc | undefined,
  input: {
    readonly projectId: string
    readonly issueMonth: string
    readonly monthlyOccurrenceKey: string
  },
) {
  return doc !== undefined &&
    fieldOf(doc, 'monthlyOccurrenceKey') === input.monthlyOccurrenceKey &&
    matchesOrigin(doc, input.projectId, input.issueMonth)
    ? {
        task: doc,
        created: false,
        archived: fieldOf(doc, 'deletedAt') !== null && fieldOf(doc, 'deletedAt') !== undefined,
      }
    : undefined
}

async function afterCreateError(input: {
  readonly payload: Payload
  readonly projectId: string
  readonly issueMonth: string
  readonly monthlyOccurrenceKey: string
  readonly error: unknown
}) {
  const recovered = recoveredTask(await findTask(input.payload, input.monthlyOccurrenceKey), input)
  if (recovered === undefined) throw input.error
  return recovered
}

/** Unique occurrence-key creation reconciles a crash or concurrent insert without rewriting tasks. */
export async function createOrRecoverMonthlyTask(input: {
  readonly payload: Payload
  readonly config: MonthlyDesignConfig
  readonly projectId: string
  readonly issueMonth: string
  readonly dueAt: number
  readonly workflowId: string
  readonly stageId: string
}): Promise<{ readonly task: Doc; readonly created: boolean; readonly archived: boolean } | undefined> {
  const monthlyOccurrenceKey = `${input.projectId}:${input.issueMonth}`
  const occurrence = { ...input, monthlyOccurrenceKey }
  const existing = recoveredTask(await findTask(input.payload, monthlyOccurrenceKey), occurrence)
  if (existing !== undefined) return existing
  const draft: TaskDraft = {
    title: input.config.title,
    projectId: asId(input.projectId),
    workflowId: asId(input.workflowId),
    stageId: asId(input.stageId),
    assigneeIds: input.config.assigneeIds,
    dueAt: input.dueAt,
    monthlyOrigin: { projectId: asId(input.projectId), issueMonth: input.issueMonth },
    monthlyOccurrenceKey,
  }
  try {
    const task = await createSystemTask(input.payload, draft)
    return { task, created: true, archived: false }
  } catch (error) {
    return afterCreateError({
      payload: input.payload,
      projectId: input.projectId,
      issueMonth: input.issueMonth,
      monthlyOccurrenceKey,
      error,
    })
  }
}

/** Assignment notices are durable and deduplicated; a failed insert leaves the caller's project cursor unadvanced. */
export async function notifyMonthlyTaskAssignees(input: {
  readonly payload: Payload
  readonly task: Doc
  readonly projectId: string
  readonly issueMonth: string
}): Promise<number> {
  const taskId = idOf(fieldOf(input.task, 'id'))
  if (taskId === undefined) throw new Error('Monthly design task has no id')
  const title = typeof fieldOf(input.task, 'title') === 'string' ? String(fieldOf(input.task, 'title')) : ''
  const notifications = createNotificationStore(input.payload)
  let created = 0
  for (const userId of await readableActiveAssignees(input.payload, input.task)) {
    const outcome = await notifications.insertIfAbsent({
      userId,
      type: 'assigned',
      dedupeKey: `monthlyDesign:${input.projectId}:${input.issueMonth}:${userId}`,
      record: { type: 'task', id: taskId },
      data: { title },
    })
    if (outcome === 'created') created += 1
  }
  return created
}

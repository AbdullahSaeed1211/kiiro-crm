import { createNotificationStore, toActor } from '@ops/adapter-payload'
import { createJsonLogger, type Id } from '@ops/kernel'
import type { WorkTaskRecord } from '@ops/module-work'
import { can } from '@ops/platform'
import type { ProductContext } from '../auth/context'

type TaskNotificationContext = Pick<ProductContext, 'payload' | 'req' | 'actor'>

const logger = createJsonLogger()

async function recipientCanReadTask(
  context: TaskNotificationContext,
  task: WorkTaskRecord,
  userId: Id,
): Promise<boolean> {
  const member = await context.payload.find({
    collection: 'users',
    where: { and: [{ id: { equals: userId } }, { active: { equals: true } }] },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req: context.req,
  })
  const memberDoc = member.docs.at(0)
  if (memberDoc === undefined) return false
  const recipient = toActor(memberDoc)
  if (recipient === undefined) return false
  return can(recipient, 'read', {
    type: 'task',
    assigneeIds: task.assigneeIds,
    watcherIds: task.watcherIds,
    ...(task.assignedById === null ? {} : { assignedById: task.assignedById }),
    parentId: task.projectId,
    relatedRecordType: task.relatedType,
    ownerOnly: task.ownerOnly,
    ...(task.groupId === null ? {} : { groupId: task.groupId }),
  })
}

async function assignmentNoticesEnabled(context: TaskNotificationContext, userId: Id): Promise<boolean> {
  const prefs = await context.payload.find({
    collection: 'notificationPrefs',
    where: { user: { equals: userId } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req: context.req,
  })
  const preference = prefs.docs.at(0)
  if (preference === undefined) return true
  const channels: unknown = Reflect.get(preference, 'channels')
  const assigned: unknown =
    typeof channels === 'object' && channels !== null ? Reflect.get(channels, 'assigned') : undefined
  return !(typeof assigned === 'object' && assigned !== null && Reflect.get(assigned, 'inApp') === false)
}

async function notifyOne(context: TaskNotificationContext, task: WorkTaskRecord, userId: Id): Promise<void> {
  try {
    if (!(await recipientCanReadTask(context, task, userId))) return
    if (!(await assignmentNoticesEnabled(context, userId))) return
    await createNotificationStore(context.payload).insertIfAbsent({
      userId,
      type: 'assigned',
      dedupeKey: `task:${task.id}:assigned:${String(task.updatedAt)}:${userId}`,
      actorId: context.actor.id,
      record: { type: 'task', id: task.id },
      data: { title: task.title },
    })
  } catch (error) {
    logger.error('task assignment notification failed', {
      taskId: String(task.id),
      recipientId: String(userId),
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    })
  }
}

/** Notifies only newly responsible people who can read the task and have in-app assignment notices enabled. */
export async function notifyTaskAssignment(
  context: TaskNotificationContext,
  task: WorkTaskRecord,
  recipientIds: readonly Id[],
): Promise<void> {
  for (const userId of recipientIds) await notifyOne(context, task, userId)
}

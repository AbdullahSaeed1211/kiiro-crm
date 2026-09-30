import type { RequestContext } from '../../container'
import type { Where } from 'payload'
import { emailMessage, text } from './normalize'
import type { EmailThreadMessage, InboxEmailMessage, PersonSummary, RecordAttachment, RelatedTask } from './types'

/** Reads run as the user unless the parent record was already authorized, then they see its whole history. */
export function activityReadOptions(parentAuthorized: boolean): { readonly overrideAccess: boolean } {
  return { overrideAccess: parentAuthorized }
}

export async function loadPeople(
  context: RequestContext,
  ids: readonly string[],
): Promise<ReadonlyMap<string, PersonSummary>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const result = await context.payload.find({
    collection: 'users',
    where: { id: { in: unique } },
    limit: unique.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return new Map(result.docs.map((user) => [user.id, { id: user.id, name: user.name, email: user.email }]))
}

export async function listProjects(
  context: RequestContext,
  organizationId: string,
): Promise<readonly { readonly id: string; readonly name: string }[]> {
  const result = await context.payload.find({
    collection: 'projects',
    where: { organization: { equals: organizationId } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return result.docs.flatMap((project) => {
    const name = text(project.name)
    return name === null ? [] : [{ id: project.id, name }]
  })
}

export async function listEmailMessages(
  context: RequestContext,
  options: Readonly<{ recordType: string; recordId: string; parentAuthorized: boolean }>,
): Promise<readonly EmailThreadMessage[]> {
  const result = await context.payload.find({
    collection: 'emailMessages',
    where: { and: [{ recordType: { equals: options.recordType } }, { recordId: { equals: options.recordId } }] },
    sort: '-occurredAt',
    limit: 50,
    pagination: false,
    depth: 0,
    ...activityReadOptions(options.parentAuthorized),
    user: context.req.user,
    req: context.req,
  })
  return result.docs.flatMap((entry) => {
    const message = emailMessage(entry as unknown as Record<string, unknown>, String(context.actor.id))
    return message === null || message.id === '' ? [] : [message]
  })
}

export async function listInboxMessages(
  context: RequestContext,
  options: Readonly<{
    direction?: 'inbound' | 'outbound'
    status?: 'queued' | 'sent' | 'failed' | 'received' | 'quarantined'
  }> = {},
): Promise<readonly InboxEmailMessage[]> {
  const filters: Where[] = [
    ...(options.direction === undefined ? [] : [{ direction: { equals: options.direction } }]),
    ...(options.status === undefined ? [] : [{ status: { equals: options.status } }]),
  ]
  const result = await context.payload.find({
    collection: 'emailMessages',
    ...(filters.length === 0 ? {} : { where: { and: filters } }),
    sort: '-occurredAt',
    limit: 100,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return result.docs.flatMap((entry) => {
    const value = entry as unknown as Record<string, unknown>
    const message = emailMessage(value, String(context.actor.id))
    const recordType = text(value.recordType)
    const recordId = text(value.recordId)
    return message === null || message.id === '' ? [] : [{ ...message, recordType, recordId }]
  })
}

export async function listRelatedTasks(
  context: RequestContext,
  recordType: string,
  recordId: string,
): Promise<readonly RelatedTask[]> {
  const result = await context.payload.find({
    collection: 'tasks',
    where: { and: [{ relatedType: { equals: recordType } }, { relatedId: { equals: recordId } }] },
    sort: '-createdAt',
    limit: 50,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return result.docs.flatMap((entry) => {
    const value = entry as unknown as Record<string, unknown>
    const id = text(value.id)
    const title = text(value.title)
    if (id === null || title === null) return []
    return [
      {
        id,
        title,
        priority: text(value.priority) ?? 'none',
        dueAt: typeof value.dueAt === 'number' ? value.dueAt : null,
        completedAt: typeof value.completedAt === 'number' ? value.completedAt : null,
      },
    ]
  })
}

export async function listRecordAttachments(
  context: RequestContext,
  recordType: string,
  recordId: string,
): Promise<readonly RecordAttachment[]> {
  const result = await context.payload.find({
    collection: 'attachments',
    where: { and: [{ recordType: { equals: recordType } }, { recordId: { equals: recordId } }] },
    sort: '-createdAt',
    limit: 50,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return result.docs.flatMap((entry) => {
    const value = entry as unknown as Record<string, unknown>
    const id = text(value.id)
    const fileName = text(value.fileName)
    const mime = text(value.mime)
    const sizeBytes = typeof value.sizeBytes === 'number' ? value.sizeBytes : 0
    return id === null || fileName === null || mime === null ? [] : [{ id, fileName, mime, sizeBytes }]
  })
}

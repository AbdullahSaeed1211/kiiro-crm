/* eslint-disable max-lines -- related record loaders share the same authorization and normalization boundary. */
import type { RequestContext } from '../../work/deps'
import type { Where } from 'payload'
import type {
  ActivityItem,
  EmailThreadMessage,
  InboxEmailMessage,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from './types'

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
function refId(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value !== null && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
function attachmentList(value: unknown): { readonly id: string; readonly fileName: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ id: entry, fileName: entry }]
    if (typeof entry !== 'object' || entry === null || !('id' in entry)) return []
    const id = typeof entry.id === 'string' ? entry.id : null
    const fileName = 'fileName' in entry && typeof entry.fileName === 'string' ? entry.fileName : id
    return id === null || fileName === null ? [] : [{ id, fileName }]
  })
}

// eslint-disable-next-line complexity -- normalization keeps malformed persisted mail out of the UI boundary.
function emailMessage(value: Record<string, unknown>): EmailThreadMessage | null {
  const direction = value.direction
  const status = value.status
  const from = text(value.from)
  const occurredAt = typeof value.occurredAt === 'number' ? value.occurredAt : Date.parse(text(value.createdAt) ?? '')
  if (
    (direction !== 'inbound' && direction !== 'outbound') ||
    !['queued', 'sent', 'failed', 'received', 'quarantined'].includes(String(status)) ||
    from === null ||
    !Number.isFinite(occurredAt)
  )
    return null
  const normalizedStatus = status as EmailThreadMessage['status']
  const subject = text(value.subject) ?? '(no subject)'
  return {
    id: text(value.id) ?? '',
    direction,
    from,
    to: textList(value.to),
    subject,
    textBody: text(value.textBody) ?? '',
    status: normalizedStatus,
    occurredAt,
    threadKey: text(value.inReplyTo) ?? subject.trim().toLowerCase(),
    attachments: attachmentList(value.attachments),
  }
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
    const message = emailMessage(entry as unknown as Record<string, unknown>)
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
    const message = emailMessage(value)
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

export function activityReadOptions(parentAuthorized: boolean): { readonly overrideAccess: boolean } {
  return { overrideAccess: parentAuthorized }
}

// eslint-disable-next-line max-lines-per-function -- activity and comment reads share one ordered timeline
export async function listActivities(
  context: RequestContext,
  options: Readonly<{
    recordType: 'organization' | 'contact'
    recordId: string
    parentAuthorized: boolean
  }>,
): Promise<readonly ActivityItem[]> {
  const [result, comments] = await Promise.all([
    context.payload.find({
      collection: 'activity',
      where: {
        and: [{ recordType: { equals: options.recordType } }, { recordId: { equals: options.recordId } }],
      },
      sort: '-occurredAt',
      limit: 30,
      pagination: false,
      depth: 0,
      ...activityReadOptions(options.parentAuthorized),
      user: context.req.user,
      req: context.req,
    }),
    context.payload.find({
      collection: 'comments',
      where: {
        and: [
          { recordType: { equals: options.recordType } },
          { recordId: { equals: options.recordId } },
          { deletedAt: { exists: false } },
        ],
      },
      sort: '-createdAt',
      limit: 30,
      pagination: false,
      depth: 0,
      ...activityReadOptions(options.parentAuthorized),
      user: context.req.user,
      req: context.req,
    }),
  ])
  const actorIds = [
    ...result.docs.flatMap((entry) => {
      const actorId = refId(entry.actor)
      return actorId === null ? [] : [actorId]
    }),
    ...comments.docs.flatMap((entry) => {
      const authorId = refId(entry.author)
      return authorId === null ? [] : [authorId]
    }),
  ]
  const people = await loadPeople(context, actorIds)
  const activities = result.docs.flatMap((entry) => {
    const occurredAt = typeof entry.occurredAt === 'number' ? entry.occurredAt : Date.parse(String(entry.occurredAt))
    if (!Number.isFinite(occurredAt)) return []
    const actorId = refId(entry.actor)
    return [
      {
        id: entry.id,
        occurredAt,
        actorName: actorId === null ? null : (people.get(actorId)?.name ?? null),
        summary: text(entry.verb) === 'record.created' ? 'Record created' : 'Record updated',
      },
    ]
  })
  const commentItems = comments.docs.flatMap((entry) => {
    const occurredAt = Date.parse(entry.createdAt)
    const body = entry.body.trim()
    if (!Number.isFinite(occurredAt) || body === '') return []
    const authorId = refId(entry.author)
    return [
      {
        id: entry.id,
        occurredAt,
        actorName: authorId === null ? null : (people.get(authorId)?.name ?? null),
        summary: `Comment: ${body.slice(0, 140)}`,
      },
    ]
  })
  return [...activities, ...commentItems].sort((left, right) => right.occurredAt - left.occurredAt).slice(0, 30)
}

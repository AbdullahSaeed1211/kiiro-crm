import type { RequestContext } from '../../work/deps'
import type { ActivityItem, PersonSummary } from './types'

export function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
export function refId(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value !== null && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
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

export function activityReadOptions(parentAuthorized: boolean): { readonly overrideAccess: boolean } {
  return { overrideAccess: parentAuthorized }
}

export async function listActivities(
  context: RequestContext,
  options: Readonly<{
    recordType: 'organization' | 'contact'
    recordId: string
    parentAuthorized: boolean
  }>,
): Promise<readonly ActivityItem[]> {
  const result = await context.payload.find({
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
  })
  const actorIds = result.docs.flatMap((entry) => {
    const actorId = refId(entry.actor)
    return actorId === null ? [] : [actorId]
  })
  const people = await loadPeople(context, actorIds)
  return result.docs.flatMap((entry) => {
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
}

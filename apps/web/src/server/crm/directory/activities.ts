import type { Where } from 'payload'
import type { RequestContext } from '../../container'
import { loadPeople } from '../../people'
import { refId, text } from './normalize'
import type { ActivityItem } from './types'

const TIMELINE_LIMIT = 30

type Target = Readonly<{
  recordType: 'organization' | 'contact'
  recordId: string
  parentAuthorized: boolean
}>

async function loadRows(context: RequestContext, { recordType, recordId, parentAuthorized }: Target) {
  const match: Where[] = [{ recordType: { equals: recordType } }, { recordId: { equals: recordId } }]
  // Reads run as the user unless the parent record was already authorized, then they see its whole history.
  return Promise.all([
    context.payload.find({
      collection: 'activity',
      where: { and: match },
      sort: '-occurredAt',
      limit: TIMELINE_LIMIT,
      pagination: false,
      depth: 0,
      overrideAccess: parentAuthorized,
      user: context.req.user,
      req: context.req,
    }),
    context.payload.find({
      collection: 'comments',
      where: { and: [...match, { deletedAt: { exists: false } }] },
      sort: '-createdAt',
      limit: TIMELINE_LIMIT,
      pagination: false,
      depth: 0,
      overrideAccess: parentAuthorized,
      user: context.req.user,
      req: context.req,
    }),
  ])
}

type Names = ReadonlyMap<string, { readonly name: string }>

const nameOf = (people: Names, id: string | null): string | null =>
  id === null ? null : (people.get(id)?.name ?? null)

/** The people who acted or commented, so one lookup names them all. */
function personIds(activities: readonly { actor?: unknown }[], comments: readonly { author?: unknown }[]): string[] {
  const ids = [...activities.map((entry) => refId(entry.actor)), ...comments.map((entry) => refId(entry.author))]
  return ids.filter((id): id is string => id !== null)
}

/** The recent history of an organization or contact: system activity and comments, newest first. */
export async function listActivities(context: RequestContext, target: Target): Promise<readonly ActivityItem[]> {
  const [activities, comments] = await loadRows(context, target)
  const people = await loadPeople(context, personIds(activities.docs, comments.docs))
  const events = activities.docs.flatMap((entry) => {
    const occurredAt = typeof entry.occurredAt === 'number' ? entry.occurredAt : Date.parse(String(entry.occurredAt))
    if (!Number.isFinite(occurredAt)) return []
    const summary = text(entry.verb) === 'record.created' ? 'Record created' : 'Record updated'
    return [{ id: entry.id, occurredAt, actorName: nameOf(people, refId(entry.actor)), summary }]
  })
  const notes = comments.docs.flatMap((entry) => {
    const occurredAt = Date.parse(entry.createdAt)
    const body = entry.body.trim()
    if (!Number.isFinite(occurredAt) || body === '') return []
    const summary = `Comment: ${body.slice(0, 140)}`
    return [{ id: entry.id, occurredAt, actorName: nameOf(people, refId(entry.author)), summary }]
  })
  return [...events, ...notes].sort((left, right) => right.occurredAt - left.occurredAt).slice(0, TIMELINE_LIMIT)
}

import type { ProductContext } from '../auth/context'
import { loadPeople } from '../people'
import { describeActivity } from './activity-text'
import { refId, text } from './directory/normalize'

const LIMIT = 100

export interface ActivityRow {
  readonly id: string
  readonly occurredAt: number
  readonly actor: string
  readonly what: string
  readonly recordType: string
  readonly recordId: string
}

/** The latest changes anyone made to records, newest first; the caller has already checked the role. */
export async function loadRecentActivity(context: ProductContext): Promise<ActivityRow[]> {
  const found = await context.payload.find({
    collection: 'activity',
    sort: '-occurredAt',
    limit: LIMIT,
    depth: 0,
    overrideAccess: true,
    req: context.req,
  })
  const people = await loadPeople(
    context,
    found.docs.flatMap((entry) => refId(entry.actor) ?? []),
  )
  return found.docs.flatMap((entry) => {
    const occurredAt = typeof entry.occurredAt === 'number' ? entry.occurredAt : Date.parse(String(entry.occurredAt))
    if (!Number.isFinite(occurredAt)) return []
    const actor = people.get(refId(entry.actor) ?? '')?.name ?? 'The system'
    const recordType = text(entry.recordType) ?? ''
    return [
      {
        id: entry.id,
        occurredAt,
        actor,
        what: describeActivity(text(entry.verb)),
        recordType,
        recordId: text(entry.recordId) ?? '',
      },
    ]
  })
}

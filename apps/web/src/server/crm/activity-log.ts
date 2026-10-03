import type { Where } from 'payload'
import type { Activity } from '../../payload-types'
import type { RequestContext } from '../container'
import { loadPeople } from '../people'
import { describeActivity } from './activity-text'
import { refId, text } from './directory/normalize'

const DAY_MS = 86_400_000
const DATE = /^\d{4}-\d{2}-\d{2}$/u

const ACTIVITY_PAGE_SIZE = 50
/** The most rows one export holds, so a download stays quick and small. */
const ACTIVITY_EXPORT_LIMIT = 5000

/** What the log is narrowed to. Every field is optional; a blank value means "any". */
export interface ActivityFilters {
  readonly actor?: string
  readonly recordType?: string
  readonly verb?: string
  /** First day, YYYY-MM-DD, in UTC. */
  readonly from?: string
  /** Last day, YYYY-MM-DD, in UTC. */
  readonly to?: string
}

export interface ActivityRow {
  readonly id: string
  readonly occurredAt: number
  readonly actor: string
  readonly what: string
  readonly verb: string
  readonly recordType: string
  readonly recordId: string
}

export interface ActivityPage {
  readonly rows: readonly ActivityRow[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

const present = (value: string | undefined): value is string => value !== undefined && value !== ''

function dayRange(filters: ActivityFilters): Where[] {
  const range: Where[] = []
  if (present(filters.from) && DATE.test(filters.from)) {
    range.push({ occurredAt: { greater_than_equal: Date.parse(`${filters.from}T00:00:00.000Z`) } })
  }
  if (present(filters.to) && DATE.test(filters.to)) {
    range.push({ occurredAt: { less_than_equal: Date.parse(`${filters.to}T00:00:00.000Z`) + DAY_MS - 1 } })
  }
  return range
}

/** The query for a set of filters; the caller has already checked the role. */
function whereFor(filters: ActivityFilters): Where {
  const parts: Where[] = [...dayRange(filters)]
  if (present(filters.actor)) parts.push({ actor: { equals: filters.actor } })
  if (present(filters.recordType)) parts.push({ recordType: { equals: filters.recordType } })
  if (present(filters.verb)) parts.push({ verb: { equals: filters.verb } })
  return parts.length === 0 ? {} : { and: parts }
}

function toRow(entry: Activity, actor: string): ActivityRow | null {
  const occurredAt = typeof entry.occurredAt === 'number' ? entry.occurredAt : Date.parse(String(entry.occurredAt))
  if (!Number.isFinite(occurredAt)) return null
  const verb = text(entry.verb) ?? ''
  return {
    id: entry.id,
    occurredAt,
    actor,
    what: describeActivity(verb === '' ? null : verb),
    verb,
    recordType: text(entry.recordType) ?? '',
    recordId: text(entry.recordId) ?? '',
  }
}

async function rowsFor(context: RequestContext, docs: readonly Activity[]): Promise<ActivityRow[]> {
  const people = await loadPeople(
    context,
    docs.flatMap((entry) => refId(entry.actor) ?? []),
  )
  return docs.flatMap((entry) => {
    const row = toRow(entry, people.get(refId(entry.actor) ?? '')?.name ?? '')
    return row === null ? [] : [row]
  })
}

async function findActivity(
  context: RequestContext,
  input: Readonly<{ filters: ActivityFilters; page: number; limit: number }>,
) {
  return context.payload.find({
    collection: 'activity',
    where: whereFor(input.filters),
    sort: '-occurredAt',
    page: input.page,
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
    req: context.req,
  })
}

/** One page of the change log, newest first; the caller has already checked the role. */
export async function loadActivityPage(
  context: RequestContext,
  input: Readonly<{ filters: ActivityFilters; page: number }>,
): Promise<ActivityPage> {
  const page = Math.max(1, input.page)
  const found = await findActivity(context, { filters: input.filters, page, limit: ACTIVITY_PAGE_SIZE })
  return {
    rows: await rowsFor(context, found.docs),
    total: found.totalDocs,
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
  }
}

/** The newest rows that match, up to the export limit, for a download. */
export async function loadActivityForExport(context: RequestContext, filters: ActivityFilters): Promise<ActivityRow[]> {
  const found = await findActivity(context, { filters, page: 1, limit: ACTIVITY_EXPORT_LIMIT })
  return rowsFor(context, found.docs)
}

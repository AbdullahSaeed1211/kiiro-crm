import type { Where } from 'payload'
import type { AuditEvent as AuditEventDoc } from '../../payload-types'
import type { RequestContext } from '../container'
import { loadPeople } from '../people'
import { refId } from '../crm/directory/normalize'
import { describeAudit } from './audit-text'

const DAY_MS = 86_400_000
const DATE = /^\d{4}-\d{2}-\d{2}$/u

export const AUDIT_PAGE_SIZE = 50
export const AUDIT_EXPORT_LIMIT = 5000

/** What the security log is narrowed to. A blank value means "any". */
export interface AuditFilters {
  readonly actor?: string
  readonly verb?: string
  readonly from?: string
  readonly to?: string
}

export interface AuditRow {
  readonly id: string
  readonly occurredAt: number
  readonly actor: string
  readonly verb: string
  readonly what: string
  readonly summary: string
}

export interface AuditPage {
  readonly rows: readonly AuditRow[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

const present = (value: string | undefined): value is string => value !== undefined && value !== ''

function whereFor(filters: AuditFilters): Where {
  const parts: Where[] = []
  if (present(filters.from) && DATE.test(filters.from)) {
    parts.push({ occurredAt: { greater_than_equal: Date.parse(`${filters.from}T00:00:00.000Z`) } })
  }
  if (present(filters.to) && DATE.test(filters.to)) {
    parts.push({ occurredAt: { less_than_equal: Date.parse(`${filters.to}T00:00:00.000Z`) + DAY_MS - 1 } })
  }
  if (present(filters.actor)) parts.push({ actor: { equals: filters.actor } })
  if (present(filters.verb)) parts.push({ verb: { equals: filters.verb } })
  return parts.length === 0 ? {} : { and: parts }
}

async function rowsFor(context: RequestContext, docs: readonly AuditEventDoc[]): Promise<AuditRow[]> {
  const people = await loadPeople(
    context,
    docs.flatMap((entry) => refId(entry.actor) ?? []),
  )
  return docs.map((entry) => ({
    id: entry.id,
    occurredAt: entry.occurredAt,
    actor: people.get(refId(entry.actor) ?? '')?.name ?? '',
    verb: entry.verb,
    what: describeAudit(entry.verb),
    summary: entry.summary ?? '',
  }))
}

async function findEvents(
  context: RequestContext,
  input: Readonly<{ filters: AuditFilters; page: number; limit: number }>,
) {
  return context.payload.find({
    collection: 'auditEvents',
    where: whereFor(input.filters),
    sort: '-occurredAt',
    page: input.page,
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
    req: context.req,
  })
}

/** One page of the security log, newest first; the caller has already checked the role. */
export async function loadAuditPage(
  context: RequestContext,
  input: Readonly<{ filters: AuditFilters; page: number }>,
): Promise<AuditPage> {
  const page = Math.max(1, input.page)
  const found = await findEvents(context, { filters: input.filters, page, limit: AUDIT_PAGE_SIZE })
  return { rows: await rowsFor(context, found.docs), total: found.totalDocs, page, pageSize: AUDIT_PAGE_SIZE }
}

/** The newest matching events, up to the export limit. */
export async function loadAuditForExport(context: RequestContext, filters: AuditFilters): Promise<AuditRow[]> {
  const found = await findEvents(context, { filters, page: 1, limit: AUDIT_EXPORT_LIMIT })
  return rowsFor(context, found.docs)
}

import { createCrmRepository, listCrmPage } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { getRequestContext, type RequestContext } from '@/server/container'
import { listActivities } from './activities'
import { listEmailMessages, listProjects, listRecordAttachments, listRelatedTasks } from './helpers'
import { loadPeople } from '../../people'
import type {
  ActivityItem,
  EmailThreadMessage,
  OrganizationListItem,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from './types'
import { parseDirectorySort } from './utils'
import { DIRECTORY_PAGE_SIZE, directoryOrder, searchWhere } from './query'

/** The most contacts or deals one record's page lists. */
const RELATED_LIMIT = 200

export interface OrganizationOption {
  readonly value: string
  readonly label: string
}

export interface DirectoryPage<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export interface OrganizationRelations {
  readonly contacts: readonly ContactRecord[]
  readonly deals: readonly DealRecord[]
  readonly projects: readonly { readonly id: string; readonly name: string }[]
}

/** Open deals (not closed) for each of the given organizations, reading only those organizations' deals. */
async function openDealCounts(
  context: RequestContext,
  organizationIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (organizationIds.length === 0) return counts
  const found = await context.payload.find({
    collection: 'deals',
    where: { and: [{ organization: { in: [...organizationIds] } }, { closedAt: { exists: false } }] },
    select: { organization: true },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  for (const deal of found.docs) {
    const id = typeof deal.organization === 'string' ? deal.organization : ''
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

export async function listOrganizations(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: string
  } = {},
): Promise<DirectoryPage<OrganizationListItem>> {
  const context = await getRequestContext()
  const page = Math.max(1, input.page ?? 1)
  const found = await listCrmPage(context.req, {
    type: 'organization',
    where: searchWhere(input.query ?? '', ['name', 'website', 'email', 'phone']),
    sort: directoryOrder(parseDirectorySort(input.sort), ['name']),
    page,
    limit: DIRECTORY_PAGE_SIZE,
  })
  const [people, openDeals] = await Promise.all([
    loadPeople(
      context,
      found.records.flatMap((record) => (record.ownerId === null ? [] : [record.ownerId])),
    ),
    openDealCounts(
      context,
      found.records.map((record) => record.id),
    ),
  ])
  return {
    items: found.records.map((record) => ({
      record,
      owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
      openDeals: openDeals.get(record.id) ?? 0,
    })),
    total: found.total,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
  }
}

export async function listOrganizationOptions(): Promise<readonly OrganizationOption[]> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const records = await repo.list('organization')
  return records
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((record) => ({ value: record.id, label: record.name }))
}

/** The organizations to choose from, and the one a `?organizationId=` link asks for when the actor can see it. */
export async function organizationChoice(
  searchParams: Promise<{ organizationId?: string | string[] }>,
): Promise<{ organizations: readonly OrganizationOption[]; organizationId: string }> {
  const [organizations, { organizationId: requested }] = await Promise.all([listOrganizationOptions(), searchParams])
  const known = typeof requested === 'string' && organizations.some((option) => option.value === requested)
  return { organizations, organizationId: known ? requested : '' }
}

export async function getOrganizationLabel(id: string): Promise<string | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const record = await repo.get('organization', id as OrganizationRecord['id'])
  return record?.name ?? null
}

export async function getOrganization(id: string): Promise<{
  readonly record: OrganizationRecord
  readonly owner: PersonSummary | null
  readonly relations: OrganizationRelations
  readonly activity: readonly ActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
  readonly relatedTasks: readonly RelatedTask[]
  readonly attachments: readonly RecordAttachment[]
} | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const where = { organization: { equals: id } }
  const [record, contacts, deals] = await Promise.all([
    repo.get('organization', id as OrganizationRecord['id']),
    listCrmPage(context.req, { type: 'contact', where, page: 1, limit: RELATED_LIMIT }),
    listCrmPage(context.req, { type: 'deal', where, page: 1, limit: RELATED_LIMIT }),
  ])
  if (record === undefined) return null
  const [people, projects, activity, emailMessages, relatedTasks, attachments] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    listProjects(context, record.id),
    listActivities(context, { recordType: 'organization', recordId: record.id, parentAuthorized: true }),
    listEmailMessages(context, { recordType: 'organization', recordId: record.id, parentAuthorized: true }),
    listRelatedTasks(context, 'organization', record.id),
    listRecordAttachments(context, 'organization', record.id),
  ])
  return {
    record,
    owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
    relations: {
      contacts: contacts.records,
      deals: deals.records,
      projects,
    },
    activity,
    emailMessages,
    relatedTasks,
    attachments,
  }
}

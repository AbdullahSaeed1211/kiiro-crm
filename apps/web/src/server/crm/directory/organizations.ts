import { getOrganizationRecord } from './organization-record'
import { createCrmRepository, listCrmPage } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { getRequestContext, type RequestContext } from '@/server/container'
import { listActivities } from './activities'
import { listEmailMessages, listProjects, listRecordAttachments, listRelatedTasks } from './helpers'
import { nextOrganizationTask } from './next-organization-task'
import { organizationReadiness, type OrganizationReadiness } from './organization-readiness'
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

/** The tabs of a client's page; each one is built from its own reads. */
export type OrganizationTab = 'overview' | 'notes' | 'activity' | 'tasks' | 'billing' | 'files' | 'email'

const EMPTY_READINESS: OrganizationReadiness = { overdueTaskCount: 0, pendingApprovalCount: 0 }

/** Runs a read only when `tab` is the open one; every other tab gets `empty` and costs no query. */
const gate =
  (tab: OrganizationTab) =>
  <T>(open: OrganizationTab, empty: T, load: () => Promise<T>): Promise<T> =>
    tab === open ? load() : Promise.resolve(empty)

const NO_RECORDS = { records: [], total: 0 }

async function organizationDetails(context: RequestContext, record: OrganizationRecord, tab: OrganizationTab) {
  const only = gate(tab)
  const target = { recordType: 'organization', recordId: record.id, parentAuthorized: true } as const
  const where = { organization: { equals: record.id } }
  const [people, projects, contacts, deals] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    only('overview', [], () => listProjects(context, record.id)),
    only('overview', NO_RECORDS, () =>
      listCrmPage(context.req, { type: 'contact', where, page: 1, limit: RELATED_LIMIT }),
    ),
    only('overview', NO_RECORDS, () =>
      listCrmPage(context.req, { type: 'deal', where, page: 1, limit: RELATED_LIMIT }),
    ),
  ])
  const projectIds = projects.map((project) => project.id)
  const [activity, emailMessages, relatedTasks, attachments, nextDueTask, readiness] = await Promise.all([
    only('activity', [], () => listActivities(context, target)),
    only('email', [], () => listEmailMessages(context, target)),
    only('tasks', [], () => listRelatedTasks(context, 'organization', record.id)),
    only('files', [], () => listRecordAttachments(context, 'organization', record.id)),
    only('overview', null, () => nextOrganizationTask(context, record.id, projectIds)),
    only('overview', EMPTY_READINESS, () => organizationReadiness(context, record.id, projectIds)),
  ])
  return {
    people,
    projects,
    contacts,
    deals,
    activity,
    emailMessages,
    relatedTasks,
    nextDueTask,
    readiness,
    attachments,
  }
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

export async function getOrganization(
  id: string,
  tab: OrganizationTab = 'overview',
): Promise<{
  readonly record: OrganizationRecord
  readonly owner: PersonSummary | null
  readonly relations: OrganizationRelations
  readonly activity: readonly ActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
  readonly relatedTasks: readonly RelatedTask[]
  readonly nextDueTask: RelatedTask | null
  readonly readiness: OrganizationReadiness
  readonly attachments: readonly RecordAttachment[]
} | null> {
  const context = await getRequestContext()
  const record = await getOrganizationRecord(id)
  if (record === undefined) return null
  const details = await organizationDetails(context, record, tab)
  return {
    record,
    owner: record.ownerId === null ? null : (details.people.get(record.ownerId) ?? null),
    relations: {
      contacts: details.contacts.records,
      deals: details.deals.records,
      projects: details.projects,
    },
    activity: details.activity,
    emailMessages: details.emailMessages,
    relatedTasks: details.relatedTasks,
    nextDueTask: details.nextDueTask,
    readiness: details.readiness,
    attachments: details.attachments,
  }
}

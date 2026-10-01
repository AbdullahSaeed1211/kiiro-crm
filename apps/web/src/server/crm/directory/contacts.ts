import { createCrmRepository, listCrmPage } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, LeadRecord, OrganizationRecord } from '@ops/module-crm'
import type { Where } from 'payload'
import { getRequestContext, type RequestContext } from '@/server/container'
import { listActivities } from './activities'
import { listEmailMessages, listRecordAttachments, listRelatedTasks } from './helpers'
import { loadPeople } from '../../people'
import type {
  ActivityItem,
  ContactListItem,
  EmailThreadMessage,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from './types'
import { parseDirectorySort } from './utils'
import { DIRECTORY_PAGE_SIZE, directoryOrder, searchClauses } from './query'

const ORGANIZATION_MATCHES = 50
/** The most leads or deals one contact's page lists. */
const RELATED_LIMIT = 200

/** Leads at the contact's organization or sent from the contact's email address. */
async function relatedLeads(context: RequestContext, record: ContactRecord): Promise<readonly LeadRecord[]> {
  const matches: Where[] = []
  if (record.organizationId !== null) matches.push({ organization: { equals: record.organizationId } })
  if (record.email !== null) matches.push({ email: { equals: record.email } })
  if (matches.length === 0) return []
  const found = await listCrmPage(context.req, { type: 'lead', where: { or: matches }, page: 1, limit: RELATED_LIMIT })
  return found.records
}

export interface DirectoryPage<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export interface ContactRelations {
  readonly organization: OrganizationRecord | null
  readonly leads: readonly { readonly id: string; readonly title: string }[]
  readonly deals: readonly DealRecord[]
}

/** Where clause for a contact search: the person's name, email or phone, or the name of their organization. */
async function contactSearch(context: RequestContext, query: string): Promise<Where> {
  const text = query.trim()
  if (text === '') return {}
  const organizations = await context.payload.find({
    collection: 'organizations',
    where: { name: { contains: text } },
    select: { name: true },
    limit: ORGANIZATION_MATCHES,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return {
    or: [
      ...searchClauses(text, ['firstName', 'lastName', 'email', 'phone']),
      ...(organizations.docs.length === 0 ? [] : [{ organization: { in: organizations.docs.map((doc) => doc.id) } }]),
    ],
  }
}

export async function listContacts(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: string
  } = {},
): Promise<DirectoryPage<ContactListItem>> {
  const context = await getRequestContext()
  const page = Math.max(1, input.page ?? 1)
  const found = await listCrmPage(context.req, {
    type: 'contact',
    where: await contactSearch(context, input.query ?? ''),
    sort: directoryOrder(parseDirectorySort(input.sort), ['firstName', 'lastName']),
    page,
    limit: DIRECTORY_PAGE_SIZE,
  })
  return { items: await contactItems(context, found.records), total: found.total, page, pageSize: DIRECTORY_PAGE_SIZE }
}

/** The rows for one page of contacts, with their owners and the names of their organizations. */
async function contactItems(context: RequestContext, records: readonly ContactRecord[]): Promise<ContactListItem[]> {
  const repo = createCrmRepository(context.req)
  const organizationIds = [
    ...new Set(records.flatMap((record) => (record.organizationId === null ? [] : [record.organizationId]))),
  ]
  const [people, organizations] = await Promise.all([
    loadPeople(
      context,
      records.flatMap((record) => (record.ownerId === null ? [] : [record.ownerId])),
    ),
    Promise.all(organizationIds.map((id) => repo.get('organization', id))),
  ])
  const byId = new Map(
    organizations.flatMap((organization) =>
      organization === undefined ? [] : [[organization.id, organization] as const],
    ),
  )
  return records.map((record) => {
    const organization = record.organizationId === null ? undefined : byId.get(record.organizationId)
    return {
      record,
      organization: organization === undefined ? null : { id: organization.id, name: organization.name },
      owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
    }
  })
}

interface ContactDetailDeps {
  readonly organization: OrganizationRecord | null
  readonly leads: readonly LeadRecord[]
  readonly deals: readonly DealRecord[]
  readonly people: ReadonlyMap<string, PersonSummary>
  readonly details: {
    activity: readonly ActivityItem[]
    emailMessages: readonly EmailThreadMessage[]
    relatedTasks: readonly RelatedTask[]
    attachments: readonly RecordAttachment[]
  }
}

export async function getContact(id: string): Promise<{
  readonly record: ContactRecord
  readonly owner: PersonSummary | null
  readonly relations: ContactRelations
  readonly activity: readonly ActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
  readonly relatedTasks: readonly RelatedTask[]
  readonly attachments: readonly RecordAttachment[]
} | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const record = await repo.get('contact', id as ContactRecord['id'])
  if (record === undefined) return null
  const [organization, leads, deals] = await Promise.all([
    record.organizationId === null ? undefined : repo.get('organization', record.organizationId),
    relatedLeads(context, record),
    listCrmPage(context.req, {
      type: 'deal',
      where: { contacts: { equals: record.id } },
      page: 1,
      limit: RELATED_LIMIT,
    }),
  ])

  const [people, activity, emailMessages, relatedTasks, attachments] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    listActivities(context, { recordType: 'contact', recordId: record.id, parentAuthorized: true }),
    listEmailMessages(context, { recordType: 'contact', recordId: record.id, parentAuthorized: true }),
    listRelatedTasks(context, 'contact', record.id),
    listRecordAttachments(context, 'contact', record.id),
  ])

  return buildContactDetail(record, {
    organization: organization ?? null,
    leads,
    deals: deals.records,
    people,
    details: { activity, emailMessages, relatedTasks, attachments },
  })
}

function buildContactDetail(
  record: ContactRecord,
  deps: ContactDetailDeps,
): {
  readonly record: ContactRecord
  readonly owner: PersonSummary | null
  readonly relations: ContactRelations
  readonly activity: readonly ActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
  readonly relatedTasks: readonly RelatedTask[]
  readonly attachments: readonly RecordAttachment[]
} {
  return {
    record,
    owner: record.ownerId === null ? null : (deps.people.get(record.ownerId) ?? null),
    relations: {
      organization: deps.organization,
      leads: deps.leads.map((lead) => ({ id: lead.id, title: lead.title })),
      deals: deps.deals,
    },
    ...deps.details,
  }
}

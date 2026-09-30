import { createCrmRepository } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, LeadRecord, OrganizationRecord } from '@ops/module-crm'
import { getRequestContext } from '@/server/container'
import { listActivities } from './activities'
import { listEmailMessages, listRecordAttachments, listRelatedTasks, loadPeople } from './helpers'
import type {
  ActivityItem,
  ContactListItem,
  EmailThreadMessage,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from './types'
import { displayName, parseDirectorySort } from './utils'
import { DIRECTORY_PAGE_SIZE, contactItems } from './query'

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

export async function listContacts(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: string
  } = {},
): Promise<DirectoryPage<ContactListItem>> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const [records, organizations] = await Promise.all([repo.list('contact'), repo.list('organization')])
  const people = await loadPeople(
    context,
    records.flatMap((record) => (record.ownerId === null ? [] : [record.ownerId])),
  )
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]))
  const query = input.query?.trim().toLowerCase() ?? ''
  const visible = records.filter((record) => {
    const organization = record.organizationId === null ? null : organizationById.get(record.organizationId)
    if (query === '') return true
    return [displayName(record), record.email, record.phone, organization?.name].some((value) =>
      value?.toLowerCase().includes(query),
    )
  })
  const items = contactItems(visible, {
    organizations: organizationById,
    people,
    sort: parseDirectorySort(input.sort),
  })
  const page = input.page ?? 1
  const start = (page - 1) * DIRECTORY_PAGE_SIZE
  return {
    items: items.slice(start, start + DIRECTORY_PAGE_SIZE),
    total: items.length,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
  }
}

interface ContactDetailDeps {
  readonly organizations: readonly OrganizationRecord[]
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
  const [record, organizations, leads, deals] = await Promise.all([
    repo.get('contact', id as ContactRecord['id']),
    repo.list('organization'),
    repo.list('lead'),
    repo.list('deal'),
  ])
  if (record === undefined) return null

  const [people, activity, emailMessages, relatedTasks, attachments] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    listActivities(context, { recordType: 'contact', recordId: record.id, parentAuthorized: true }),
    listEmailMessages(context, { recordType: 'contact', recordId: record.id, parentAuthorized: true }),
    listRelatedTasks(context, 'contact', record.id),
    listRecordAttachments(context, 'contact', record.id),
  ])

  return buildContactDetail(record, {
    organizations,
    leads,
    deals,
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
  const organizationMap = new Map(deps.organizations.map((org) => [org.id, org]))
  const organization = record.organizationId === null ? null : (organizationMap.get(record.organizationId) ?? null)
  return {
    record,
    owner: record.ownerId === null ? null : (deps.people.get(record.ownerId) ?? null),
    relations: {
      organization,
      leads: deps.leads
        .filter(
          (lead) =>
            lead.organizationId === record.organizationId || (record.email !== null && lead.email === record.email),
        )
        .map((lead) => ({ id: lead.id, title: lead.title })),
      deals: deps.deals.filter((deal) => deal.contactIds.includes(record.id)),
    },
    ...deps.details,
  }
}

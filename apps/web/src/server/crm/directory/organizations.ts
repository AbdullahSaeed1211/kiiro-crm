import { createCrmRepository } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { getRequestContext } from '@/server/container'
import {
  listActivities,
  listEmailMessages,
  listProjects,
  listRecordAttachments,
  listRelatedTasks,
  loadPeople,
} from './helpers'
import type {
  ActivityItem,
  EmailThreadMessage,
  OrganizationListItem,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from './types'
import { parseDirectorySort } from './utils'
import { DIRECTORY_PAGE_SIZE, sortOrganizations } from './query'

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

export async function listOrganizations(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: string
  } = {},
): Promise<DirectoryPage<OrganizationListItem>> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const [records, deals] = await Promise.all([repo.list('organization'), repo.list('deal')])
  const people = await loadPeople(
    context,
    records.flatMap((record) => (record.ownerId === null ? [] : [record.ownerId])),
  )
  const query = input.query?.trim().toLowerCase() ?? ''
  const visible = records.filter((record) => {
    if (query === '') return true
    return [record.name, record.website, record.email, record.phone].some((value) =>
      value?.toLowerCase().includes(query),
    )
  })
  const items = sortOrganizations(
    visible.map((record) => ({
      record,
      owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
      openDeals: deals.filter((deal) => deal.organizationId === record.id && deal.closedAt === null).length,
    })),
    parseDirectorySort(input.sort),
  )
  const page = input.page ?? 1
  const start = (page - 1) * DIRECTORY_PAGE_SIZE
  return {
    items: items.slice(start, start + DIRECTORY_PAGE_SIZE),
    total: items.length,
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
  const [record, contacts, deals] = await Promise.all([
    repo.get('organization', id as OrganizationRecord['id']),
    repo.list('contact'),
    repo.list('deal'),
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
      contacts: contacts.filter((contact) => contact.organizationId === record.id),
      deals: deals.filter((deal) => deal.organizationId === record.id),
      projects,
    },
    activity,
    emailMessages,
    relatedTasks,
    attachments,
  }
}

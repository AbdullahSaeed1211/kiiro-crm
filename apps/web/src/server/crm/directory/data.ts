import { createCrmRepository } from '@ops/adapter-payload'
import type { ContactRecord, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { getRequestContext } from '../../work/deps'
import { listActivities, listProjects, loadPeople } from './helpers'
import { displayName, type DirectorySort } from './utils'

export const DIRECTORY_PAGE_SIZE = 50

export interface PersonSummary {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface OrganizationListItem {
  readonly record: OrganizationRecord
  readonly owner: PersonSummary | null
  readonly openDeals: number
}

export interface ContactListItem {
  readonly record: ContactRecord
  readonly organization: { readonly id: string; readonly name: string } | null
  readonly owner: PersonSummary | null
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

export interface ContactRelations {
  readonly organization: OrganizationRecord | null
  readonly leads: readonly { readonly id: string; readonly title: string }[]
  readonly deals: readonly DealRecord[]
}

export interface ActivityItem {
  readonly id: string
  readonly occurredAt: number
  readonly actorName: string | null
  readonly summary: string
}

function sortOrganizations(items: readonly OrganizationListItem[], sort: DirectorySort): OrganizationListItem[] {
  const direction = sort.startsWith('-') ? -1 : 1
  return [...items].sort((a, b) => {
    const left = sort.endsWith('updatedAt') ? a.record.updatedAt : a.record.name
    const right = sort.endsWith('updatedAt') ? b.record.updatedAt : b.record.name
    return (
      direction *
      (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right)))
    )
  })
}

function sortContacts(items: readonly ContactListItem[], sort: DirectorySort): ContactListItem[] {
  const direction = sort.startsWith('-') ? -1 : 1
  return [...items].sort((a, b) => {
    const left = sort.endsWith('updatedAt') ? a.record.updatedAt : displayName(a.record)
    const right = sort.endsWith('updatedAt') ? b.record.updatedAt : displayName(b.record)
    return (
      direction *
      (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right)))
    )
  })
}

function contactItems(
  records: readonly ContactRecord[],
  options: Readonly<{
    organizations: ReadonlyMap<string, OrganizationRecord>
    people: ReadonlyMap<string, PersonSummary>
    sort: DirectorySort
  }>,
): ContactListItem[] {
  const { organizations, people, sort } = options
  const items = records.map((record) => {
    const organization = record.organizationId === null ? null : organizations.get(record.organizationId)
    return {
      record,
      organization:
        organization === null || organization === undefined ? null : { id: organization.id, name: organization.name },
      owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
    }
  })
  return sortContacts(items, sort)
}

export async function listOrganizations(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: DirectorySort
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
    input.sort ?? 'name',
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

export async function listContacts(
  input: {
    readonly query?: string
    readonly page?: number
    readonly sort?: DirectorySort
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
  const items = contactItems(visible, { organizations: organizationById, people, sort: input.sort ?? 'name' })
  const page = input.page ?? 1
  const start = (page - 1) * DIRECTORY_PAGE_SIZE
  return {
    items: items.slice(start, start + DIRECTORY_PAGE_SIZE),
    total: items.length,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
  }
}

export async function getOrganization(id: string): Promise<{
  readonly record: OrganizationRecord
  readonly owner: PersonSummary | null
  readonly relations: OrganizationRelations
  readonly activity: readonly ActivityItem[]
} | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const [record, contacts, deals] = await Promise.all([
    repo.get('organization', id as OrganizationRecord['id']),
    repo.list('contact'),
    repo.list('deal'),
  ])
  if (record === undefined) return null
  const [people, projects, activity] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    listProjects(context, record.id),
    listActivities(context, 'organization', record.id),
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
  }
}

export async function getContact(id: string): Promise<{
  readonly record: ContactRecord
  readonly owner: PersonSummary | null
  readonly relations: ContactRelations
  readonly activity: readonly ActivityItem[]
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
  const [people, activity] = await Promise.all([
    loadPeople(context, record.ownerId === null ? [] : [record.ownerId]),
    listActivities(context, 'contact', record.id),
  ])
  const organization =
    record.organizationId === null ? null : (organizations.find((item) => item.id === record.organizationId) ?? null)
  return {
    record,
    owner: record.ownerId === null ? null : (people.get(record.ownerId) ?? null),
    relations: {
      organization,
      leads: leads
        .filter(
          (lead) =>
            lead.organizationId === record.organizationId || (record.email !== null && lead.email === record.email),
        )
        .map((lead) => ({ id: lead.id, title: lead.title })),
      deals: deals.filter((deal) => deal.contactIds.includes(record.id)),
    },
    activity,
  }
}

export {
  displayName,
  formatDirectorySort,
  parseDirectoryPage,
  parseDirectorySort,
  personLabel,
  queryValue,
} from './utils'
export type { DirectorySort } from './utils'

import type { ContactRecord, OrganizationRecord } from '@ops/module-crm'
import type { ContactListItem, OrganizationListItem, PersonSummary } from './types'
import { displayName, type DirectorySort } from './utils'

export const DIRECTORY_PAGE_SIZE = 50

export function sortOrganizations(items: readonly OrganizationListItem[], sort: DirectorySort): OrganizationListItem[] {
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

export function contactItems(
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

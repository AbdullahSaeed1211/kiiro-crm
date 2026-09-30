import type { ContactRecord, OrganizationRecord } from '@ops/module-crm'
import type { ContactListItem, OrganizationListItem, PersonSummary } from './types'
import { displayName, type DirectorySort } from './utils'

export const DIRECTORY_PAGE_SIZE = 50

/** Sorts directory rows by name (as the caller defines it) or by last update, ascending or, with a leading `-`, descending. */
function sortDirectory<T extends { readonly record: { readonly updatedAt: number } }>(
  items: readonly T[],
  sort: DirectorySort,
  nameOf: (item: T) => string,
): T[] {
  const direction = sort.startsWith('-') ? -1 : 1
  const byUpdate = sort.endsWith('updatedAt')
  return [...items].sort(
    (a, b) => direction * (byUpdate ? a.record.updatedAt - b.record.updatedAt : nameOf(a).localeCompare(nameOf(b))),
  )
}

export const sortOrganizations = (items: readonly OrganizationListItem[], sort: DirectorySort) =>
  sortDirectory(items, sort, (item) => item.record.name)

const sortContacts = (items: readonly ContactListItem[], sort: DirectorySort) =>
  sortDirectory(items, sort, (item) => displayName(item.record))

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

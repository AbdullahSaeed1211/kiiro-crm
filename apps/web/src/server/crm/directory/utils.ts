import type { ContactRecord } from '@ops/module-crm'
import type { PersonSummary } from './data'

export function parseDirectoryPage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export type DirectorySort = 'name' | '-name' | 'updatedAt' | '-updatedAt'

export function parseDirectorySort(value: string | undefined): DirectorySort {
  return value === 'name' || value === '-name' || value === 'updatedAt' || value === '-updatedAt' ? value : 'name'
}

export function formatDirectorySort(sort: DirectorySort): string {
  return sort
}

export function displayName(contact: Pick<ContactRecord, 'firstName' | 'lastName'>): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
}

export function personLabel(person: PersonSummary | null): string {
  return person?.name ?? 'Unassigned'
}

export function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function hasRelationItems(items: readonly unknown[]): boolean {
  return items.length > 0
}

export function safeExternalHref(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export function withActorOwner(input: unknown, ownerId: string): unknown {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return input
  return { ...input, ownerId }
}

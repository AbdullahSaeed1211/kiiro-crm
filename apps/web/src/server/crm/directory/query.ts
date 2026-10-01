import type { Where } from 'payload'
import type { DirectorySort } from './utils'

export const DIRECTORY_PAGE_SIZE = 50

/** The database sort for a directory sort: by the given name fields, or by last update, ascending or with a leading `-` descending. */
export function directoryOrder(sort: DirectorySort, nameFields: readonly string[]): string[] {
  const prefix = sort.startsWith('-') ? '-' : ''
  const fields = sort.endsWith('updatedAt') ? ['updatedAt'] : nameFields
  return [...fields.map((field) => `${prefix}${field}`), 'id']
}

/** One clause per field that matches when the field contains the search text (case-insensitive). */
export function searchClauses(query: string, fields: readonly string[]): Where[] {
  return fields.map((field) => ({ [field]: { contains: query.trim() } }))
}

/** Matches records where any of `fields` contains the search text; empty text matches everything. */
export function searchWhere(query: string, fields: readonly string[]): Where {
  return query.trim() === '' ? {} : { or: searchClauses(query, fields) }
}

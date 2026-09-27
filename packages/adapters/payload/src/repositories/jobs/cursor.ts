import type { Where } from 'payload'
import type { Doc } from '../documents'
import { fieldOf } from '../documents'

export interface JobCursor {
  readonly id: string
  readonly updatedAt: number
}

export function cursor(doc: Doc): JobCursor | undefined {
  const value = fieldOf(doc, 'cursor')
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const id = record['id']
  const updatedAt = record['updatedAt']
  return typeof id === 'string' && typeof updatedAt === 'number' ? { id, updatedAt } : undefined
}

function afterCursor(cursorValue: JobCursor | undefined, field = 'updatedAt'): Where | undefined {
  if (cursorValue === undefined) return undefined
  const timestamp = new Date(cursorValue.updatedAt).toISOString()
  return {
    or: [
      { [field]: { greater_than: timestamp } },
      { and: [{ [field]: { equals: timestamp } }, { id: { greater_than: cursorValue.id } }] },
    ],
  }
}

export function withCursor(clauses: readonly Where[], cursorValue: JobCursor | undefined, field = 'updatedAt'): Where {
  const continuation = afterCursor(cursorValue, field)
  return continuation === undefined ? { and: [...clauses] } : { and: [...clauses, continuation] }
}

export function isAfterCursor(updatedAt: number | undefined, id: string, cursorValue: JobCursor | undefined): boolean {
  return (
    cursorValue === undefined ||
    (updatedAt !== undefined &&
      (updatedAt > cursorValue.updatedAt || (updatedAt === cursorValue.updatedAt && id > cursorValue.id)))
  )
}

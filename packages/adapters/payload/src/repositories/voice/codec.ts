import { fieldOf, textOf, type Doc } from '../documents'

export function valueOf<T extends object>(doc: Doc, isType?: (value: unknown) => value is T): T {
  const value = fieldOf(doc, 'value')
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid voice record')
  if (isType !== undefined && !isType(value)) throw new Error('Invalid voice record shape')
  return value as T
}

export function documentId(doc: Doc): string {
  const id = textOf(doc, 'id')
  if (id === undefined) throw new Error('Voice record is missing its id')
  return id
}

export function stamp(now: number, previous?: number): number {
  return Math.max(now, (previous ?? -1) + 1)
}

export function uniqueIndex(error: unknown): boolean {
  return error instanceof Error && /unique constraint/i.test(error.message)
}

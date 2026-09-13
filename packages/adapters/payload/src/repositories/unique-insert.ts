import { ValidationError, type CollectionSlug, type Payload } from 'payload'

const MAX_CAUSE_DEPTH = 4
const DATABASE_UNIQUE = /unique constraint failed/i
const VALIDATION_UNIQUE = /unique/i

// Column names are snake_case in SQL and camelCase in Payload, so both compare without underscores.
const squash = (text: string): string => text.replaceAll('_', '').toLowerCase()

function causeMessages(error: unknown): string[] {
  const messages: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    messages.push(current.message)
    current = current.cause
  }
  return messages
}

// The drizzle adapter turns driver codes it knows into a ValidationError; D1 errors reach us as the raw message.
function isUniqueViolation(error: unknown, field: string): boolean {
  const target = squash(field)
  const validation =
    error instanceof ValidationError &&
    error.data.errors.some((entry) => squash(entry.path) === target && VALIDATION_UNIQUE.test(entry.message))
  return validation || causeMessages(error).some((text) => DATABASE_UNIQUE.test(text) && squash(text).includes(target))
}

/** A system create guarded by a unique field. */
export interface UniqueInsert {
  readonly collection: CollectionSlug
  readonly field: string
  readonly value: string
  readonly data: Readonly<Record<string, unknown>>
}

/** Creates the document as system work unless its unique `field` value already exists or is inserted concurrently. */
export async function insertUnique(payload: Payload, input: UniqueInsert): Promise<'created' | 'duplicate'> {
  const { collection, field, value } = input
  const where = { [field]: { equals: value } }
  const found = await payload.find({ collection, where, limit: 1, pagination: false, depth: 0, overrideAccess: true })
  if (found.docs.length > 0) return 'duplicate'
  try {
    await payload.create({ collection, data: { ...input.data }, depth: 0, overrideAccess: true })
    return 'created'
  } catch (error) {
    if (isUniqueViolation(error, field)) return 'duplicate'
    throw error
  }
}

import type { CollectionSlug, PayloadRequest, Sort, Where } from 'payload'
import type { Doc } from './documents'

/** A read on behalf of the request user; `limit` 0 reads every match. */
export interface UserQuery {
  readonly collection: CollectionSlug
  readonly where: Where
  readonly sort?: Sort
  readonly limit?: number
}

/** Compare-and-set write: applies `data` only while the document's `updatedAt` equals `expectedUpdatedAt`. */
export interface GuardedUpdate {
  readonly collection: CollectionSlug
  readonly id: string
  readonly expectedUpdatedAt: number
  readonly data: Readonly<Record<string, unknown>>
}

interface BulkResult {
  readonly docs: Doc[]
  readonly errors: readonly { readonly message: string }[]
}

// Apps augment Payload with generated per-collection data types the adapter cannot know, so writes use a loose view.
interface LooseWrites {
  update(options: Readonly<Record<string, unknown>>): Promise<BulkResult>
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

// Widening to `object` first keeps the cast necessary with and without generated types.
const loosen = (payload: object): LooseWrites => payload as LooseWrites
const writes = (req: PayloadRequest): LooseWrites => loosen(req.payload)

/** Creates a document as system work (`overrideAccess: true`) within the request. */
export function createAsSystem(req: PayloadRequest, collection: CollectionSlug, data: object): Promise<Doc> {
  return writes(req).create({ collection, data, depth: 0, overrideAccess: true, req })
}

/** Finds documents with the collection's access applied to the request user. */
export async function findAsUser(req: PayloadRequest, query: UserQuery): Promise<Doc[]> {
  const { collection, where, sort, limit = 0 } = query
  const page = await req.payload.find({
    collection,
    where,
    limit,
    ...(sort === undefined ? {} : { sort }),
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return page.docs
}

/** Updates by `where` on id and `updatedAt` with the request user's access; `undefined` when no document matched. */
export async function updateIfUnchanged(req: PayloadRequest, update: GuardedUpdate): Promise<Doc | undefined> {
  const expected = new Date(update.expectedUpdatedAt)
  if (Number.isNaN(expected.getTime())) return undefined
  const where = { and: [{ id: { equals: update.id } }, { updatedAt: { equals: expected.toISOString() } }] }
  const result = await writes(req).update({
    collection: update.collection,
    where,
    data: { ...update.data },
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  // Bulk updates collect per-document failures such as validation errors instead of throwing.
  const [failure] = result.errors
  if (failure !== undefined) throw new Error(`${update.collection} update failed: ${failure.message}`)
  return result.docs[0]
}

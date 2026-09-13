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
  const result = await req.payload.update({
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

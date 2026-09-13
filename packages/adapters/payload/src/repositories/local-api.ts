import { combineQueries, executeAccess, type CollectionSlug, type PayloadRequest, type Sort, type Where } from 'payload'
import { writeIfUnchanged } from './conditional-write'
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

// Apps augment Payload with generated per-collection data types the adapter cannot know, so writes use a loose view.
interface LooseWrites {
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

// Widening to `object` first keeps the cast necessary with and without generated types.
const loosen = (payload: object): LooseWrites => payload as LooseWrites

const byId = (id: string): Where => ({ id: { equals: id } })

/** Creates a document as system work (`overrideAccess: true`) within the request. */
export function createAsSystem(req: PayloadRequest, collection: CollectionSlug, data: object): Promise<Doc> {
  return loosen(req.payload).create({ collection, data, depth: 0, overrideAccess: true, req })
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

// Checks the collection's update access, as Payload's update does, against the expected version: a write that lands
// in between changes `updatedAt`, so the conditional write can only change the version this check allowed.
async function mayUpdate(req: PayloadRequest, update: GuardedUpdate, version: Where): Promise<boolean> {
  const { payload } = req
  const config = payload.collections[update.collection]?.config
  if (config === undefined) throw new Error(`Unknown collection ${update.collection}`)
  const access = await executeAccess({ id: update.id, req }, config.access.update)
  const where = combineQueries(version, access)
  const { totalDocs } = await payload.count({ collection: update.collection, where, overrideAccess: true, req })
  return totalDocs > 0
}

/**
 * Compare-and-set in one conditional statement after the request user's update access check (Forbidden when denied);
 * returns the saved document as the user reads it, or `undefined` when the version is gone or outside the user's access.
 */
export async function updateIfUnchanged(req: PayloadRequest, update: GuardedUpdate): Promise<Doc | undefined> {
  const expected = new Date(update.expectedUpdatedAt)
  if (Number.isNaN(expected.getTime())) return undefined
  const { collection, id, data } = update
  const expectedUpdatedAt = expected.toISOString()
  if (!(await mayUpdate(req, update, { and: [byId(id), { updatedAt: { equals: expectedUpdatedAt } }] }))) {
    return undefined
  }
  // At least one millisecond past the expected version, so writes in the same millisecond still get new versions.
  const updatedAt = new Date(Math.max(Date.now(), expected.getTime() + 1)).toISOString()
  if (!(await writeIfUnchanged(req.payload, { collection, id, expectedUpdatedAt, updatedAt, data }))) return undefined
  const [doc] = await findAsUser(req, { collection, where: byId(id), limit: 1 })
  return doc
}

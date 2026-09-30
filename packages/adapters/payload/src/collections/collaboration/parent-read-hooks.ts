import { isManagerUp } from '@ops/platform'
import { NotFound, type CollectionAfterOperationHook, type PayloadRequest } from 'payload'
import { resolveActor } from '../../access/actor'
import { canReadParentReference } from './fields'

const CACHE_KEY = 'parentReadCache'

function reference(doc: unknown): { recordType: string; recordId: string } | undefined {
  if (typeof doc !== 'object' || doc === null) return undefined
  const recordType: unknown = Reflect.get(doc, 'recordType')
  const recordId: unknown = Reflect.get(doc, 'recordId')
  return typeof recordType === 'string' && typeof recordId === 'string' ? { recordType, recordId } : undefined
}

function cacheOf(req: PayloadRequest): Map<string, Promise<boolean>> {
  const existing = req.context[CACHE_KEY]
  if (existing instanceof Map) return existing as Map<string, Promise<boolean>>
  const created = new Map<string, Promise<boolean>>()
  req.context[CACHE_KEY] = created
  return created
}

/** Whether the request's user may read the record this comment or attachment belongs to; asked once per record per request. */
async function mayRead(req: PayloadRequest, doc: unknown): Promise<boolean> {
  const parent = reference(doc)
  if (parent === undefined) return false
  const cache = cacheOf(req)
  const key = `${parent.recordType}:${parent.recordId}`
  const known = cache.get(key)
  if (known !== undefined) return known
  const answer = canReadParentReference(req, parent)
  cache.set(key, answer)
  return answer
}

interface Page {
  readonly docs: readonly unknown[]
  readonly totalDocs: number
}

/** A page without the rows whose parent record the user cannot read. */
async function readablePage(req: PayloadRequest, page: Page): Promise<Page> {
  const allowed = await Promise.all(page.docs.map((doc) => mayRead(req, doc)))
  const docs = page.docs.filter((_, index) => allowed[index])
  return { ...page, docs, totalDocs: docs.length === page.docs.length ? page.totalDocs : docs.length }
}

/**
 * Keeps comments and attachments inside the scope of their parent record. Managers and system reads see everything;
 * for everyone else a list drops unreadable parents' rows and a single read of one is a not-found.
 */
export const filterToReadableParents: CollectionAfterOperationHook = async (input) => {
  const { result, req, args } = input
  const operation: unknown = Reflect.get(input, 'operation')
  if (Reflect.get(args, 'overrideAccess') === true) return result
  const actor = await resolveActor(req)
  if (actor === undefined || isManagerUp(actor)) return result
  if (operation === 'find') return readablePage(req, result as Page)
  if (operation === 'findByID' && !(await mayRead(req, result))) throw new NotFound()
  return result
}

import type { CollectionSlug, PayloadRequest } from 'payload'
import type { Doc } from '../documents'

interface LooseCreate {
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

// Apps augment Payload with generated data types the adapter cannot know; widening to `object` keeps the cast valid.
const creator = (payload: object): LooseCreate => payload as LooseCreate

/** Creates a document with the collection's create access applied to the request user. */
export function createAsUser(req: PayloadRequest, collection: CollectionSlug, data: object): Promise<Doc> {
  return creator(req.payload).create({ collection, data, depth: 0, overrideAccess: false, user: req.user, req })
}

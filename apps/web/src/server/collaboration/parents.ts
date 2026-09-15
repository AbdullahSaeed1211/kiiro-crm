import type { Payload } from 'payload'
import type { AuthContext } from './auth'

type RecordCollection = 'organizations' | 'contacts' | 'leads' | 'deals' | 'projects' | 'tasks'
const RECORD_COLLECTIONS: Readonly<Record<string, RecordCollection | undefined>> = {
  organization: 'organizations',
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
  project: 'projects',
  task: 'tasks',
}

/** Reads a parent through collection access, which applies the staff scope before a file/comment is served. */
export interface ParentReference {
  readonly recordType: string
  readonly recordId: string
}

export async function canReadParent(
  payload: Payload,
  context: AuthContext,
  reference: ParentReference,
): Promise<boolean> {
  const collection = RECORD_COLLECTIONS[reference.recordType]
  if (collection === undefined || reference.recordId === '') return false
  const result = await payload.find({
    collection,
    where: { id: { equals: reference.recordId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: context.user,
  })
  return result.docs.length > 0
}

import { getRequestContext, type RequestContext } from '../../work/deps'

export interface SavedViewSummary {
  readonly id: string
  readonly recordType: string
  readonly name: string
  readonly kind: 'table' | 'board' | 'calendar' | 'timeline'
  readonly ownerId: string | null
  readonly filter: unknown
  readonly sort: unknown
  readonly columns: unknown
  readonly pinned: boolean
  readonly isDefault: boolean
}

function idOf(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) return idOf(value.id)
  return null
}

function kindOf(value: unknown): SavedViewSummary['kind'] {
  return value === 'board' || value === 'calendar' || value === 'timeline' ? value : 'table'
}

/** Lists only the shared/personal saved views the signed-in actor may read. */
export async function listSavedViews(
  recordType: string,
  requestContext?: RequestContext,
): Promise<readonly SavedViewSummary[]> {
  const context = requestContext ?? (await getRequestContext())
  const result = await context.payload.find({
    collection: 'savedViews',
    where: { recordType: { equals: recordType } },
    sort: 'name',
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return result.docs.map((doc) => ({
    id: doc.id,
    recordType: doc.recordType,
    name: doc.name,
    kind: kindOf(doc.kind),
    ownerId: idOf(doc.owner),
    filter: doc.filter,
    sort: doc.sort,
    columns: doc.columns,
    pinned: doc.pinned === true,
    isDefault: doc.isDefault === true,
  }))
}

import type { Payload, Where } from 'payload'
import { STALE_TRACKABLE_COLLECTIONS } from '../../contracts/names'
import type { JobCursor } from './cursor'
import { isAfterCursor, withCursor } from './cursor'
import { isOpenStage, openStageClause, target, terminalStages, type JobTarget } from './job-targets'

export async function listStalledTargets(
  payload: Payload,
  input: { readonly before: number; readonly limit: number; readonly cursor?: JobCursor | undefined },
): Promise<readonly JobTarget[]> {
  if (input.limit <= 0) return []
  const cutoff = new Date(input.before).toISOString()
  const terminals = await terminalStages(
    payload,
    STALE_TRACKABLE_COLLECTIONS.map(([type]) => type),
  )
  const collections = STALE_TRACKABLE_COLLECTIONS
  const pages = await Promise.all(
    collections.map(([type, collection]) => {
      const clauses: Where[] = [{ updatedAt: { less_than: cutoff } }]
      const open = openStageClause(terminals.get(type))
      if (open !== undefined) clauses.push(open)
      return payload.find({
        collection,
        where: withCursor(clauses, input.cursor),
        sort: 'updatedAt',
        limit: input.limit,
        depth: 0,
        overrideAccess: true,
      })
    }),
  )
  return pages
    .flatMap((page, index) => {
      const type = collections[index]?.[0] ?? ''
      return page.docs.flatMap((doc) => (isOpenStage(doc, terminals.get(type)) ? target(doc, type) : []))
    })
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, input.cursor))
    .toSorted((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0) || a.record.id.localeCompare(b.record.id))
    .slice(0, input.limit)
}

import type { Payload, Where } from 'payload'
import { COLLECTIONS, RECORD_TYPES } from '../../contracts/names'
import type { JobCursor } from './cursor'
import { isAfterCursor, withCursor } from './cursor'
import { isOpenStage, openStageClause, target, terminalStages, type JobTarget } from './job-targets'

export async function listOverdueTargets(
  payload: Payload,
  input: { readonly before: number; readonly limit: number; readonly cursor?: JobCursor | undefined },
): Promise<readonly JobTarget[]> {
  if (input.limit <= 0) return []
  const terminals = await terminalStages(payload, [RECORD_TYPES.tasks])
  const clauses: Where[] = [{ dueAt: { less_than: input.before } }]
  const open = openStageClause(terminals.get(RECORD_TYPES.tasks))
  if (open !== undefined) clauses.push(open)
  const page = await payload.find({
    collection: COLLECTIONS.tasks,
    where: withCursor(clauses, input.cursor),
    sort: 'updatedAt',
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs
    .filter((doc) => isOpenStage(doc, terminals.get(RECORD_TYPES.tasks)))
    .flatMap((doc) => target(doc, RECORD_TYPES.tasks))
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, input.cursor))
    .slice(0, input.limit)
}

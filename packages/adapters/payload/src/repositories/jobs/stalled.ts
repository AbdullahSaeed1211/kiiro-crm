import type { Payload, Where } from 'payload'
import { isTerminalCategory } from '../../collections/workflow-rules'
import { COLLECTIONS, FIELDS, STALE_TRACKABLE_COLLECTIONS } from '../../contracts/names'
import { fieldOf, idOf, idsOf, msOf, textOf, type Doc } from '../documents'
import { toWorkflow } from '../workflow-mapping'
import type { JobCursor } from './cursor'
import type { JobTarget } from './overdue'
import { isAfterCursor, withCursor } from './cursor'

async function terminalStages(
  payload: Payload,
  recordTypes: readonly string[],
): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
  const page = await payload.find({
    collection: COLLECTIONS.workflows,
    where: { recordType: { in: [...recordTypes] } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const result = new Map<string, Set<string>>()
  for (const doc of page.docs) {
    const workflow = toWorkflow(doc)
    if (workflow === undefined || !recordTypes.includes(workflow.recordType)) continue
    const ids = result.get(workflow.recordType) ?? new Set<string>()
    for (const stage of workflow.stages) if (isTerminalCategory(stage.category)) ids.add(stage.id)
    result.set(workflow.recordType, ids)
  }
  return result
}

function openStageClause(terminal: ReadonlySet<string> | undefined): Where | undefined {
  if (terminal === undefined || terminal.size === 0) return undefined
  // SQL `NOT IN` is not true for NULL, and a record without a stage is open.
  return { or: [{ stageId: { not_in: [...terminal] } }, { stageId: { exists: false } }] }
}

function isOpenStage(doc: Doc, terminal: ReadonlySet<string> | undefined): boolean {
  return terminal?.has(textOf(doc, 'stageId') ?? '') !== true
}

function target(doc: Doc, type: string): JobTarget[] {
  const id = idOf(fieldOf(doc, 'id'))
  if (id === undefined) return []
  const ownerId = idOf(fieldOf(doc, FIELDS.owner))
  const assigneeIds = idsOf(fieldOf(doc, FIELDS.assignees))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  return [
    {
      record: { type, id },
      title: textOf(doc, 'title') ?? textOf(doc, 'name') ?? '',
      ...(ownerId === undefined ? {} : { ownerId }),
      ...(assigneeIds.length === 0 ? {} : { assigneeIds }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
    },
  ]
}

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

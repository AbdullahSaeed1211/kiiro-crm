import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'
import type { Payload, Where } from 'payload'
import { isTerminalCategory } from '../../collections/workflow-rules'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../../contracts/names'
import { fieldOf, idOf, idsOf, msOf, textOf, type Doc } from '../documents'
import { toWorkflow } from '../workflow-mapping'
import type { JobCursor } from './cursor'
import { isAfterCursor, withCursor } from './cursor'

export interface JobTarget {
  readonly record: RecordRef
  readonly title: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly updatedAt?: number
  readonly digestLocalTime?: string
}

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

import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'
import type { Payload, Where } from 'payload'
import { isTerminalCategory } from '../../collections/workflow-rules'
import { COLLECTIONS, FIELDS } from '../../contracts/names'
import { fieldOf, idOf, idsOf, msOf, textOf, type Doc } from '../documents'
import { toWorkflow } from '../workflow-mapping'

export interface JobTarget {
  readonly record: RecordRef
  readonly title: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly updatedAt?: number
  readonly digestLocalTime?: string
}

export async function terminalStages(
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

export function openStageClause(terminal: ReadonlySet<string> | undefined): Where | undefined {
  if (terminal === undefined || terminal.size === 0) return undefined
  // SQL `NOT IN` is not true for NULL, and a record without a stage is open.
  return { or: [{ stageId: { not_in: [...terminal] } }, { stageId: { exists: false } }] }
}

export function isOpenStage(doc: Doc, terminal: ReadonlySet<string> | undefined): boolean {
  return terminal?.has(textOf(doc, 'stageId') ?? '') !== true
}

export function target(doc: Doc, type: string): JobTarget[] {
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

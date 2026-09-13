import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'
import type { Payload, Where } from 'payload'
import { isTerminalCategory } from '../collections/workflow-rules'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../contracts/names'
import { fieldOf, idOf, idsOf, numberOf, textOf, type Doc } from './documents'
import { toWorkflow } from './workflow-mapping'

interface DueTask {
  readonly record: RecordRef
  readonly title: string
  readonly assigneeIds: readonly Id[]
  readonly dueAt: number
}

interface DueTaskSource {
  listDueWithin(fromMs: number, toMs: number, limit: number): Promise<readonly DueTask[]>
}

interface DueWindow {
  readonly fromMs: number
  readonly toMs: number
  readonly terminal: ReadonlySet<string>
}

async function terminalStageIds(payload: Payload): Promise<ReadonlySet<string>> {
  const where = { recordType: { equals: RECORD_TYPES.tasks } }
  const page = await payload.find({
    collection: COLLECTIONS.workflows,
    where,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const stages = page.docs.flatMap((doc) => toWorkflow(doc)?.stages ?? [])
  return new Set(stages.filter((stage) => isTerminalCategory(stage.category)).map((stage) => stage.id))
}

function dueWhere({ fromMs, toMs, terminal }: DueWindow): Where {
  const window: Where[] = [{ dueAt: { greater_than_equal: fromMs } }, { dueAt: { less_than: toMs } }]
  if (terminal.size === 0) return { and: window }
  // SQL `NOT IN` is not true for NULL, and a task without a stage is open.
  const open: Where = { or: [{ stageId: { not_in: [...terminal] } }, { stageId: { exists: false } }] }
  return { and: [...window, open] }
}

function toDueTask(doc: Doc, { fromMs, toMs, terminal }: DueWindow): DueTask[] {
  const id = idOf(fieldOf(doc, 'id'))
  const dueAt = numberOf(doc, 'dueAt')
  const due = dueAt !== null && fromMs <= dueAt && dueAt < toMs
  if (id === undefined || !due || terminal.has(textOf(doc, 'stageId') ?? '')) return []
  const assigneeIds = idsOf(fieldOf(doc, FIELDS.assignees))
  return [{ record: { type: RECORD_TYPES.tasks, id }, title: textOf(doc, 'title') ?? '', assigneeIds, dueAt }]
}

/** Due-soon source on the Payload Local API, structurally the Cloudflare `DueItemSource`; reads are system work. */
export function createDueItemSource(payload: Payload): DueTaskSource {
  return {
    listDueWithin: async (fromMs, toMs, limit) => {
      // Payload reads every match for limit 0.
      if (limit <= 0) return []
      const window = { fromMs, toMs, terminal: await terminalStageIds(payload) }
      const page = await payload.find({
        collection: COLLECTIONS.tasks,
        where: dueWhere(window),
        sort: 'dueAt',
        limit,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      // The in-memory check keeps the window and stage rules exact whatever the database adapter makes of the query.
      return page.docs.flatMap((doc) => toDueTask(doc, window))
    },
  }
}

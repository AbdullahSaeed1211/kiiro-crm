import type { RuleCandidate } from '@ops/module-automation'
import type { Payload, Where } from 'payload'
import {
  idOf,
  idsOf,
  localDate,
  READ_LIMIT,
  startOfLocalDay,
  textOf,
  warnTruncated,
  type CandidateWindow,
} from './candidate-common'

const TERMINAL_CATEGORIES: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])

/** Stages a task is finished in, from every task workflow. */
async function terminalTaskStageIds(payload: Payload): Promise<string[]> {
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const ids: string[] = []
  for (const workflow of found.docs) {
    const stages = Array.isArray(workflow.stages) ? workflow.stages : []
    for (const stage of stages) {
      const id = idOf(stage.id)
      if (id !== null && TERMINAL_CATEGORIES.has(stage.category)) ids.push(id)
    }
  }
  return ids
}

function taskCandidate(doc: object, triggerKey: string): RuleCandidate[] {
  const id = idOf(Reflect.get(doc, 'id'))
  if (id === null) return []
  return [
    {
      record: { type: 'task', id },
      trigger: 'task.overdue',
      triggerKey,
      ownerId: idOf(Reflect.get(doc, 'owner')) ?? idsOf(Reflect.get(doc, 'assignees')).at(0) ?? null,
      stageId: textOf(Reflect.get(doc, 'stageId')),
    },
  ]
}

/** Open tasks due before the workspace-local start of the window's day. */
export async function taskOverdueCandidates(
  payload: Payload,
  window: CandidateWindow,
  timeZone: string,
): Promise<readonly RuleCandidate[]> {
  const date = localDate(timeZone, window.end)
  const today = startOfLocalDay(timeZone, window.end)
  const terminals = await terminalTaskStageIds(payload)
  const clauses: Where[] = [{ dueAt: { less_than: today } }]
  if (terminals.length > 0) clauses.push({ or: [{ stageId: { not_in: terminals } }, { stageId: { exists: false } }] })
  const found = await payload.find({
    collection: 'tasks',
    where: { and: clauses },
    sort: 'dueAt',
    limit: READ_LIMIT,
    depth: 0,
    overrideAccess: true,
  })
  warnTruncated('task.overdue', found.docs.length)
  return found.docs.flatMap((doc) => taskCandidate(doc, `overdue:${date}`))
}

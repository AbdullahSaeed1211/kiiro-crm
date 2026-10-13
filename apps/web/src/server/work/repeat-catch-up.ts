import { nextOccurrence, TASK_REPEATS, type TaskRepeat } from '@ops/module-work'
import type { Payload, Where } from 'payload'

/** Open repeating tasks one run looks at. */
const BATCH = 100
/** Most periods one run adds to one task, so a very old due date is caught up over a few runs. */
const MAX_NEW_PER_TASK = 12
const FINISHED = new Set(['done_success', 'done_failure', 'cancelled'])
const DEFAULT_RANK = '000000000001'

type Doc = Readonly<Record<string, unknown>>

const idOf = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null) return idOf(Reflect.get(value, 'id'))
  return null
}
const idList = (value: unknown): string[] => (Array.isArray(value) ? value.flatMap((item) => idOf(item) ?? []) : [])
const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const textOf = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback)
const repeatOf = (doc: Doc): TaskRepeat => TASK_REPEATS.find((item) => item === doc.repeat) ?? 'none'

/** Ids of the stages a task is finished in, from the task workflow. */
async function finishedStageIds(payload: Payload): Promise<string[]> {
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const stages: unknown = found.docs[0]?.stages
  if (!Array.isArray(stages)) return []
  return stages.flatMap((stage: unknown) => {
    const row = (typeof stage === 'object' && stage !== null ? stage : {}) as Doc
    return typeof row.id === 'string' && typeof row.category === 'string' && FINISHED.has(row.category) ? [row.id] : []
  })
}

/** Whether a task with the same title, project and due date already exists, so a rerun adds nothing twice. */
async function occurrenceExists(payload: Payload, doc: Doc, dueAt: number): Promise<boolean> {
  const project = idOf(doc.project)
  const where: Where = {
    and: [
      { title: { equals: textOf(doc.title, '') } },
      { dueAt: { equals: dueAt } },
      project === null ? { project: { exists: false } } : { project: { equals: project } },
    ],
  }
  const found = await payload.find({ collection: 'tasks', where, limit: 1, depth: 0, overrideAccess: true })
  return found.docs.length > 0
}

/** The task workflow's id and the stage a new task starts in. */
async function startingStage(payload: Payload, doc: Doc): Promise<{ workflow: string; stageId: string } | null> {
  const workflowId = idOf(doc.workflow)
  const found = await payload.find({
    collection: 'workflows',
    where: workflowId === null ? { recordType: { equals: 'task' } } : { id: { equals: workflowId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const workflow = found.docs.at(0)
  if (workflow === undefined || typeof workflow.defaultStageId !== 'string' || workflow.defaultStageId === '')
    return null
  return { workflow: workflow.id, stageId: workflow.defaultStageId }
}

/** The fields a copy of a task keeps: title, people, project, priority and the rest, but not its stage or dates. */
function copiedFields(doc: Doc): Record<string, unknown> {
  return {
    title: textOf(doc.title, ''),
    description: doc.description ?? null,
    project: idOf(doc.project),
    relatedType: doc.relatedType ?? null,
    relatedId: doc.relatedId ?? null,
    parentTask: idOf(doc.parentTask),
    rank: textOf(doc.rank, DEFAULT_RANK),
    priority: doc.priority ?? 'none',
    assignees: idList(doc.assignees),
    group: idOf(doc.group),
    ownerOnly: doc.ownerOnly === true,
  }
}

async function createOccurrence(
  payload: Payload,
  doc: Doc,
  input: { readonly dueAt: number; readonly startAt: number | null; readonly repeat: TaskRepeat },
): Promise<void> {
  if (await occurrenceExists(payload, doc, input.dueAt)) return
  const start = await startingStage(payload, doc)
  if (start === null) return
  await payload.create({
    collection: 'tasks',
    overrideAccess: true,
    data: { ...copiedFields(doc), ...start, ...input },
  } as Parameters<Payload['create']>[0])
}

/** The due dates of the periods that have passed since this one, oldest first. */
function elapsedDues(dueAt: number, repeat: TaskRepeat, now: number): number[] {
  const dues: number[] = []
  let next = nextOccurrence(dueAt, repeat)
  while (next <= now && dues.length < MAX_NEW_PER_TASK) {
    dues.push(next)
    next = nextOccurrence(next, repeat)
  }
  return dues
}

/** Adds the missing periods of one open repeating task, then stops it repeating so the last one carries on. */
async function catchUpTask(payload: Payload, doc: Doc, now: number): Promise<number> {
  const repeat = repeatOf(doc)
  const dueAt = numberOrNull(doc.dueAt)
  if (repeat === 'none' || dueAt === null) return 0
  const dues = elapsedDues(dueAt, repeat, now)
  if (dues.length === 0) return 0
  const startAt = numberOrNull(doc.startAt)
  // The last period created carries the repeat on, and only after it exists is the original released from it.
  for (const [index, due] of dues.entries()) {
    await createOccurrence(payload, doc, {
      dueAt: due,
      startAt: startAt === null ? null : startAt + (due - dueAt),
      repeat: index === dues.length - 1 ? repeat : 'none',
    })
  }
  await payload.update({ collection: 'tasks', id: idOf(doc.id) ?? '', data: { repeat: 'none' }, overrideAccess: true })
  return dues.length
}

/**
 * Gives every elapsed period of an open repeating task its own task, dated on its own day, so a missed week or month
 * shows as its own overdue row and on its own calendar day instead of waiting for the earlier one to be completed.
 * Safe to rerun: a period that already has a task with the same title, project and due date is not added again.
 * @returns how many tasks were added.
 */
export async function catchUpRepeatingTasks(payload: Payload, now: number): Promise<number> {
  const finished = await finishedStageIds(payload)
  const clauses: Where[] = [{ repeat: { not_equals: 'none' } }, { dueAt: { less_than: now } }]
  if (finished.length > 0) clauses.push({ stageId: { not_in: finished } })
  const page = await payload.find({
    collection: 'tasks',
    where: { and: clauses },
    sort: 'dueAt',
    limit: BATCH,
    depth: 0,
    overrideAccess: true,
  })
  let added = 0
  for (const doc of page.docs as unknown as readonly Doc[]) added += await catchUpTask(payload, doc, now)
  return added
}

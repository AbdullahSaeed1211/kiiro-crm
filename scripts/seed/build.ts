import { DEV_PASSWORD, type ProjectSeed, type TaskSeed, type UserSeed, type WorkflowSeed } from './data'

type Data = Record<string, unknown>

/** One day in milliseconds. */
export const DAY_MS = 86_400_000

/** Ids of stored documents keyed by seed key or name. */
export type IdMap = ReadonlyMap<string, string>

/** A stored workflow and its stage ids keyed by stage name. */
export interface WorkflowRef {
  readonly id: string
  readonly stageIds: IdMap
}

/** Stored ids a task or project refers to, plus the seed clock. */
export interface RecordContext {
  readonly now: number
  readonly users: IdMap
  readonly workflow: WorkflowRef
}

/** Id of `key`; throws when the seed refers to something that was not stored. */
export function idOf(ids: IdMap, key: string): string {
  const id = ids.get(key)
  if (id === undefined) throw new Error(`seed refers to unknown "${key}"`)
  return id
}

const optionalId = (ids: IdMap, key: string | undefined): string | null => (key === undefined ? null : idOf(ids, key))

/** Fixed-width rank, so seeded records sort in seed order. */
export function rankAt(index: number): string {
  return String(index + 1).padStart(4, '0')
}

/** Workflow document with a new id per stage; the first stage is the default. */
export function workflowData(seed: WorkflowSeed, newId: () => string): Data {
  const stages = seed.stages.map((stage, position) => ({ id: newId(), ...stage, position }))
  return { recordType: seed.recordType, name: seed.name, stages, defaultStageId: stages[0]?.id }
}

const stageEntry = (row: unknown): [string, string][] => {
  if (typeof row !== 'object' || row === null) return []
  const { id, name } = row as { readonly id?: unknown; readonly name?: unknown }
  return typeof id === 'string' && typeof name === 'string' ? [[name, id]] : []
}

/** Stage ids of a stored workflow keyed by stage name. */
export function stageIdsOf(workflow: Readonly<Data>): Map<string, string> {
  const stages: unknown = workflow['stages']
  return new Map(Array.isArray(stages) ? (stages as readonly unknown[]).flatMap(stageEntry) : [])
}

/** User document; `users` must already hold the user it reports to. */
export function userData(seed: UserSeed, ids: { readonly users: IdMap; readonly groups: IdMap }): Data {
  const { email, name, role } = seed
  const groups = seed.group === undefined ? [] : [idOf(ids.groups, seed.group)]
  return { email, name, role, password: DEV_PASSWORD, groups, reportsTo: optionalId(ids.users, seed.reportsTo) }
}

const stageData = (context: RecordContext, stage: string): Data => ({
  workflow: context.workflow.id,
  stageId: idOf(context.workflow.stageIds, stage),
  stageEnteredAt: context.now,
})

const atDay = (now: number, day: number): number => now + day * DAY_MS

/** Project document owned by the manager inside `organization`. */
export function projectData(seed: ProjectSeed, context: RecordContext & { readonly organization: string }): Data {
  return {
    name: seed.name,
    organization: context.organization,
    owner: idOf(context.users, 'manager'),
    members: seed.members.map((key) => idOf(context.users, key)),
    ...stageData(context, seed.stage),
    startAt: atDay(context.now, seed.startDay),
    targetEndAt: atDay(context.now, seed.targetEndDay),
  }
}

/** Task document at board position `index`. */
export function taskData(
  seed: TaskSeed,
  index: number,
  context: RecordContext & { readonly groups: IdMap; readonly projects: IdMap },
): Data {
  return {
    title: seed.title,
    ...stageData(context, seed.stage),
    priority: seed.priority,
    assignees: seed.assignees.map((key) => idOf(context.users, key)),
    group: optionalId(context.groups, seed.group),
    project: optionalId(context.projects, seed.project),
    startAt: atDay(context.now, seed.startDay),
    dueAt: atDay(context.now, seed.dueDay),
    rank: rankAt(index),
  }
}

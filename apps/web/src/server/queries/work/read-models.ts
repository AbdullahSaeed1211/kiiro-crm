import { getRequestContext } from '../../work/deps'
import type { StageCategory } from '@ops/platform'

export interface WorkListTask {
  readonly id: string
  readonly title: string
  readonly stageId: string
  readonly stage: string
  readonly stageCategory: StageCategory
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  readonly description: string | null
  readonly startAt: number | null
  readonly assigneeIds: readonly string[]
  readonly projectId: string | null
  readonly dueAt: number | null
  readonly completedAt: number | null
  readonly updatedAt: number
}
export interface WorkListProject {
  readonly id: string
  readonly name: string
  readonly stage: string
  readonly stageCategory: StageCategory
  readonly ownerId: string | null
  readonly memberIds: readonly string[]
  readonly targetEndAt: number | null
  readonly updatedAt: number
}
export interface WorkReadModel {
  readonly tasks: readonly WorkListTask[]
  readonly projects: readonly WorkListProject[]
  readonly people: ReadonlyMap<string, string>
  readonly actorId: string
  readonly timeZone: string
  readonly weekStartsOn: 0 | 1
  readonly stages: readonly {
    readonly id: string
    readonly name: string
    readonly category: StageCategory
    readonly color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'
  }[]
}

const value = (doc: object, key: string): unknown => Reflect.get(doc, key)
const text = (doc: object, key: string): string => {
  const item = value(doc, key)
  return typeof item === 'string' ? item : ''
}
const id = (doc: object, key: string): string | null => {
  const item = value(doc, key)
  return typeof item === 'string' || typeof item === 'number' ? String(item) : null
}
const ids = (doc: object, key: string): string[] => {
  const item = value(doc, key)
  return Array.isArray(item)
    ? item.flatMap((entry) => (typeof entry === 'string' || typeof entry === 'number' ? [String(entry)] : []))
    : []
}
const number = (doc: object, key: string): number | null => {
  const item = value(doc, key)
  return typeof item === 'number' && Number.isFinite(item) ? item : null
}
const date = (doc: object, key: string): number => {
  const item = value(doc, key)
  return typeof item === 'string' ? Date.parse(item) : 0
}
const rows = (item: unknown): readonly object[] =>
  Array.isArray(item) ? item.filter((row): row is object => typeof row === 'object' && row !== null) : []

interface StageLabel {
  readonly name: string
  readonly category: StageCategory
}
function addStages(stages: Map<string, StageLabel>, workflow: object): void {
  for (const row of rows(value(workflow, 'stages'))) {
    const stageId = id(row, 'id')
    const category = value(row, 'category')
    if (stageId !== null && typeof category === 'string')
      stages.set(stageId, { name: text(row, 'name'), category: category as StageCategory })
  }
}
function workflowStages(workflows: readonly object[]): WorkReadModel['stages'] {
  const result = new Map<string, WorkReadModel['stages'][number]>()
  for (const workflow of workflows) {
    for (const row of rows(value(workflow, 'stages'))) {
      const stageId = id(row, 'id')
      const category = value(row, 'category')
      if (stageId === null || typeof category !== 'string') continue
      const color = value(row, 'color')
      result.set(stageId, {
        id: stageId,
        name: text(row, 'name'),
        category: category as StageCategory,
        color: typeof color === 'string' ? (color as WorkReadModel['stages'][number]['color']) : 'gray',
      })
    }
  }
  return [...result.values()]
}
function mapTask(doc: object, stages: ReadonlyMap<string, StageLabel>): WorkListTask {
  const stageId = text(doc, 'stageId')
  const priorities = ['none', 'low', 'medium', 'high', 'urgent'] as const
  return {
    id: id(doc, 'id') ?? '',
    title: text(doc, 'title'),
    stageId,
    stage: stages.get(stageId)?.name ?? 'Unknown stage',
    stageCategory: stages.get(stageId)?.category ?? 'open',
    priority: priorities.find((item) => item === value(doc, 'priority')) ?? 'none',
    description: typeof value(doc, 'description') === 'string' ? String(value(doc, 'description')) : null,
    startAt: number(doc, 'startAt'),
    assigneeIds: ids(doc, 'assignees'),
    projectId: id(doc, 'project'),
    dueAt: number(doc, 'dueAt'),
    completedAt: number(doc, 'completedAt'),
    updatedAt: date(doc, 'updatedAt'),
  }
}
function mapProject(doc: object, stages: ReadonlyMap<string, StageLabel>): WorkListProject {
  const stageId = text(doc, 'stageId')
  return {
    id: id(doc, 'id') ?? '',
    name: text(doc, 'name'),
    stage: stages.get(stageId)?.name ?? 'Unknown stage',
    stageCategory: stages.get(stageId)?.category ?? 'open',
    ownerId: id(doc, 'owner'),
    memberIds: ids(doc, 'members'),
    targetEndAt: number(doc, 'targetEndAt'),
    updatedAt: date(doc, 'updatedAt'),
  }
}

async function pages(context: Awaited<ReturnType<typeof getRequestContext>>) {
  const request = { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
  return Promise.all([
    context.payload.find({ collection: 'projects', ...request, sort: 'name' }),
    context.payload.find({ collection: 'tasks', ...request, sort: 'rank' }),
    context.payload.find({
      collection: 'workflows',
      ...request,
      where: { or: [{ recordType: { equals: 'project' } }, { recordType: { equals: 'task' } }] },
    }),
    context.payload.find({ collection: 'users', ...request }),
  ])
}

/** Reads scoped work records and labels for Phase 1 pages. */
export async function loadWorkReadModel(): Promise<WorkReadModel> {
  const context = await getRequestContext()
  const [projectPage, taskPage, workflowPage, userPage] = await pages(context)
  const stages = new Map<string, StageLabel>()
  for (const workflow of workflowPage.docs as readonly object[]) addStages(stages, workflow)
  const tasks = (taskPage.docs as readonly object[]).map((doc) => mapTask(doc, stages))
  const projects = (projectPage.docs as readonly object[]).map((doc) => mapProject(doc, stages))
  const people = new Map(
    (userPage.docs as readonly object[]).flatMap((doc) => {
      const userId = id(doc, 'id')
      return userId === null ? [] : [[userId, text(doc, 'name')] as const]
    }),
  )
  const settings = await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const configuredWeekStart = value(settings, 'weekStartsOn')
  return {
    tasks,
    projects,
    people,
    actorId: String(context.actor.id),
    timeZone: text(settings, 'timezone') || 'UTC',
    weekStartsOn: configuredWeekStart === 0 ? 0 : 1,
    stages: workflowStages(workflowPage.docs),
  }
}

/** Loads one scoped task for the task page. */
export async function loadTask(idValue: string): Promise<WorkListTask | undefined> {
  return (await loadWorkReadModel()).tasks.find((task) => task.id === idValue)
}
/** Loads one scoped project and its task rows. */
export async function loadProject(
  idValue: string,
): Promise<{ readonly project: WorkListProject; readonly tasks: readonly WorkListTask[] } | undefined> {
  const model = await loadWorkReadModel()
  const project = model.projects.find((item) => item.id === idValue)
  return project === undefined
    ? undefined
    : { project, tasks: model.tasks.filter((task) => task.projectId === project.id) }
}

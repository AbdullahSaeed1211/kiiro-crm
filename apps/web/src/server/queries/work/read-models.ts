import { getWorkspaceSettings } from '../../auth/context'
import { getRequestContext, type RequestContext } from '@/server/container'
import type { StageCategory } from '@ops/platform'
import { normalizeLocale, type Locale } from '../../../i18n/config'
import { loadWorkPages, type ReadPurpose } from './read-pages'

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
interface WorkListProject {
  readonly id: string
  readonly name: string
  readonly organizationId: string | null
  readonly description: string | null
  readonly stage: string
  readonly stageCategory: StageCategory
  readonly ownerId: string | null
  readonly memberIds: readonly string[]
  readonly startAt: number | null
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
  readonly locale: Locale
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

export interface StageLabel {
  readonly name: string
  readonly category: StageCategory
}
export function addStages(stages: Map<string, StageLabel>, workflow: object): void {
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
export function mapTask(doc: object, stages: ReadonlyMap<string, StageLabel>): WorkListTask {
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
    organizationId: id(doc, 'organization'),
    description: typeof value(doc, 'description') === 'string' ? String(value(doc, 'description')) : null,
    stage: stages.get(stageId)?.name ?? 'Unknown stage',
    stageCategory: stages.get(stageId)?.category ?? 'open',
    ownerId: id(doc, 'owner'),
    memberIds: ids(doc, 'members'),
    startAt: number(doc, 'startAt'),
    targetEndAt: number(doc, 'targetEndAt'),
    updatedAt: date(doc, 'updatedAt'),
  }
}

/** Reads scoped work records and labels for Phase 1 pages. */
export async function loadWorkReadModel(
  context?: RequestContext,
  purpose: ReadPurpose = 'full',
): Promise<WorkReadModel> {
  const requestContext = context ?? (await getRequestContext())
  const {
    projects: projectDocs,
    tasks: taskDocs,
    workflows: workflowDocs,
    users: userDocs,
    settings,
  } = await loadWorkPages(requestContext, purpose)
  const stages = new Map<string, StageLabel>()
  for (const workflow of workflowDocs as readonly object[]) addStages(stages, workflow)
  const tasks = (taskDocs as readonly object[]).map((doc) => mapTask(doc, stages))
  const projects = (projectDocs as readonly object[]).map((doc) => mapProject(doc, stages))
  const people = mapPeople(userDocs)
  const configuredWeekStart = value(settings, 'weekStartsOn')
  const locale = normalizeLocale(value(settings, 'locale'))
  return {
    tasks,
    projects,
    people,
    actorId: String(requestContext.actor.id),
    timeZone: text(settings, 'timezone') || 'UTC',
    weekStartsOn: configuredWeekStart === 0 ? 0 : 1,
    locale,
    stages: workflowStages(workflowDocs),
  }
}

function mapPeople(documents: readonly object[]): ReadonlyMap<string, string> {
  return new Map(
    documents.flatMap((doc) => {
      const userId = id(doc, 'id')
      return userId === null ? [] : [[userId, text(doc, 'name')] as const]
    }),
  )
}

/** Reads only the workspace locale when a full work read model would be unnecessary. */
export async function loadWorkspaceLocale(): Promise<Locale> {
  const settings = await getWorkspaceSettings()
  return normalizeLocale(value(settings, 'locale'))
}

/** The signed-in user's tasks with what My tasks needs to render them. */
export type MyTaskModel = Pick<WorkReadModel, 'tasks' | 'actorId' | 'timeZone' | 'stages' | 'locale'>

/** Reads only the signed-in user's tasks for the dedicated My tasks page. */
export async function loadMyTaskModel(context?: RequestContext): Promise<MyTaskModel> {
  const requestContext = context ?? (await getRequestContext())
  const request = { depth: 0, overrideAccess: false as const, req: requestContext.req }
  const [taskPage, workflowPage, settings] = await Promise.all([
    requestContext.payload.find({
      collection: 'tasks',
      ...request,
      where: { assignees: { in: [String(requestContext.actor.id)] } },
      sort: ['dueAt', 'id'],
      limit: 0,
      pagination: false,
    }),
    requestContext.payload.find({
      collection: 'workflows',
      ...request,
      where: { recordType: { equals: 'task' } },
      limit: 1,
      pagination: false,
    }),
    getWorkspaceSettings(),
  ])
  const stages = new Map<string, StageLabel>()
  const workflows = workflowPage.docs as readonly object[]
  for (const workflow of workflows) addStages(stages, workflow)
  return {
    tasks: (taskPage.docs as readonly object[]).map((doc) => mapTask(doc, stages)),
    actorId: String(requestContext.actor.id),
    timeZone: text(settings, 'timezone') || 'UTC',
    stages: workflowStages(workflows),
    locale: normalizeLocale(value(settings, 'locale')),
  }
}

/** Loads one scoped project and its task rows. */

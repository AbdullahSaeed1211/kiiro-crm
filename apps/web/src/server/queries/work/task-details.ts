import { asId } from '@ops/kernel'
import { canUpdateTask } from '@ops/module-work'
import type { TaskSheetOptions, TaskSheetTask } from '@ops/ui/composites/TaskSheet'
import { getRequestContext, workCommandDeps, type RequestContext } from '@/server/container'
import { loadWorkspaceLocale, mapTask, workflowStages, type StageLabel } from './read-models'

const TERMINAL_CATEGORIES: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])
const isTerminalCategory = (category: string): boolean => TERMINAL_CATEGORIES.has(category)

/** Reads names for selected assignees, or the assignable people list when no ids are supplied. */
export async function loadTaskPeople(userIds?: readonly string[]): Promise<ReadonlyMap<string, string>> {
  if (userIds?.length === 0) return new Map()
  const requestContext = await getRequestContext()
  const { docs } = await requestContext.payload.find({
    collection: 'users',
    depth: 0,
    limit: userIds === undefined ? 0 : userIds.length,
    pagination: false,
    overrideAccess: false,
    req: requestContext.req,
    select: { id: true, name: true },
    ...(userIds === undefined ? {} : { where: { id: { in: [...userIds] } } }),
  })
  return new Map(docs.map((person) => [person.id, person.name] as const))
}

/** Everything the task panel and page render: the task, its stages, assignable people and edit access. */
export interface TaskView {
  readonly task: TaskSheetTask
  readonly options: TaskSheetOptions
}

const TASK_FIELDS = { id: true, title: true, stageId: true, updatedAt: true } as const
const DETAIL_FIELDS = {
  ...TASK_FIELDS,
  priority: true,
  description: true,
  startAt: true,
  dueAt: true,
  assignees: true,
  parentTask: true,
  group: true,
} as const

function readTaskDocuments(context: RequestContext, idValue: string) {
  const request = { depth: 0, pagination: false, overrideAccess: false as const, req: context.req }
  return Promise.all([
    context.payload.find({
      collection: 'tasks',
      ...request,
      limit: 1,
      where: { id: { equals: idValue } },
      select: DETAIL_FIELDS,
    }),
    context.payload.find({ collection: 'workflows', ...request, limit: 0, where: { recordType: { equals: 'task' } } }),
    context.payload.find({
      collection: 'tasks',
      ...request,
      limit: 0,
      where: { parentTask: { equals: idValue } },
      select: TASK_FIELDS,
    }),
    context.payload.find({ collection: 'users', ...request, limit: 0, select: { id: true, name: true } }),
  ])
}

async function loadParent(context: RequestContext, value: unknown): Promise<TaskSheetTask['parent']> {
  if (typeof value !== 'string') return null
  const { docs } = await context.payload.find({
    collection: 'tasks',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    req: context.req,
    where: { id: { equals: value } },
    select: { id: true, title: true },
  })
  const parent = docs.at(0)
  return parent === undefined ? null : { id: parent.id, title: parent.title }
}

async function canEdit(context: RequestContext, taskId: string): Promise<boolean> {
  const deps = await workCommandDeps(context)
  const record = await deps.repo.getTask(asId(taskId))
  return record !== undefined && canUpdateTask(deps, record)
}

/** Loads one scoped task for the detail views; `undefined` when it does not exist or is outside the actor's scope. */
export async function loadTaskView(idValue: string): Promise<TaskView | undefined> {
  const context = await getRequestContext()
  const [[taskPage, workflowPage, subtaskPage, memberPage], locale] = await Promise.all([
    readTaskDocuments(context, idValue),
    loadWorkspaceLocale(),
  ])
  const doc = taskPage.docs.at(0)
  if (doc === undefined) return undefined
  const stages = workflowStages(workflowPage.docs)
  const terminal = new Set(stages.filter((stage) => isTerminalCategory(stage.category)).map((stage) => stage.id))
  const task = mapTask(doc, new Map<string, StageLabel>(stages.map((stage) => [stage.id, stage])))
  const [parent, canUpdate] = await Promise.all([loadParent(context, doc.parentTask), canEdit(context, task.id)])
  const subtasks = subtaskPage.docs.map((sub) => ({
    id: sub.id,
    title: sub.title,
    complete: terminal.has(sub.stageId ?? ''),
    updatedAt: Date.parse(sub.updatedAt),
  }))
  return {
    task: {
      id: task.id,
      title: task.title,
      stageId: task.stageId,
      updatedAt: task.updatedAt,
      priority: task.priority,
      assigneeIds: task.assigneeIds,
      startAt: task.startAt,
      dueAt: task.dueAt,
      description: task.description,
      parent,
      subtasks,
    },
    options: { stages, members: memberPage.docs.map(({ id, name }) => ({ id, name })), canUpdate, locale },
  }
}

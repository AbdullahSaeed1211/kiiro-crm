import { asId } from '@ops/kernel'
import { canMarkTaskOwnerOnly, canUpdateTask } from '@ops/module-work'
import type { TaskSheetOptions, TaskSheetTask } from '@ops/ui/composites/TaskSheet'
import { getRequestContext, workCommandDeps, type RequestContext } from '@/server/container'
import { loadTaskContexts } from './tasks/task-contexts'
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

const REPEATS = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
const repeatOf = (doc: { repeat?: unknown }): TaskSheetTask['repeat'] =>
  REPEATS.find((item) => item === doc.repeat) ?? 'none'

/** Everything the task panel and page render: the task, its stages, assignable people and edit access. */
/** The record a task is linked to (a client, contact, lead or deal), as the viewer may see it. */
export interface TaskRelated {
  readonly type: string
  readonly id: string
  readonly label: string
  readonly href: string
}

export interface TaskView {
  readonly task: TaskSheetTask
  readonly options: TaskSheetOptions
  readonly related: TaskRelated | null
}

const TASK_FIELDS = { id: true, title: true, stageId: true, updatedAt: true } as const
const DETAIL_FIELDS = {
  ...TASK_FIELDS,
  priority: true,
  repeat: true,
  description: true,
  startAt: true,
  dueAt: true,
  assignees: true,
  parentTask: true,
  group: true,
  ownerOnly: true,
  relatedType: true,
  relatedId: true,
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
    context.payload.find({ collection: 'groups', ...request, limit: 0, select: { id: true, name: true } }),
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

function subtasksOf(
  docs: readonly { id: string; title: string; stageId?: string | null; updatedAt: string }[],
  terminal: ReadonlySet<string>,
): TaskSheetTask['subtasks'] {
  return docs.map((sub) => ({
    id: sub.id,
    title: sub.title,
    complete: terminal.has(sub.stageId ?? ''),
    updatedAt: Date.parse(sub.updatedAt),
  }))
}

/** The linked record's name and address when the viewer may read it. */
async function loadRelated(
  context: RequestContext,
  doc: { id: string; relatedType?: string | null; relatedId?: string | null },
): Promise<TaskRelated | null> {
  if (typeof doc.relatedType !== 'string' || typeof doc.relatedId !== 'string') return null
  const labels = await loadTaskContexts(context, [
    { id: asId(doc.id), projectId: null, relatedType: doc.relatedType, relatedId: asId(doc.relatedId) },
  ])
  const found = labels.get(doc.id)
  return found === undefined ? null : { type: found.type, id: doc.relatedId, label: found.label, href: found.href }
}

/** The task as the panel shows it. */
function sheetTask({
  doc,
  task,
  parent,
  subtasks,
}: Readonly<{
  doc: Record<string, unknown>
  task: ReturnType<typeof mapTask>
  parent: TaskSheetTask['parent']
  subtasks: TaskSheetTask['subtasks']
}>): TaskSheetTask {
  return {
    id: task.id,
    title: task.title,
    stageId: task.stageId,
    updatedAt: task.updatedAt,
    priority: task.priority,
    repeat: repeatOf(doc),
    assigneeIds: task.assigneeIds,
    groupId: typeof doc.group === 'string' ? doc.group : null,
    startAt: task.startAt,
    dueAt: task.dueAt,
    description: task.description,
    parent,
    ownerOnly: doc.ownerOnly === true,
    subtasks,
  }
}

/** Loads one scoped task for the detail views; `undefined` when it does not exist or is outside the actor's scope. */
export async function loadTaskView(idValue: string): Promise<TaskView | undefined> {
  const context = await getRequestContext()
  const [[taskPage, workflowPage, subtaskPage, memberPage, groupPage], locale] = await Promise.all([
    readTaskDocuments(context, idValue),
    loadWorkspaceLocale(),
  ])
  const doc = taskPage.docs.at(0)
  if (doc === undefined) return undefined
  const stages = workflowStages(workflowPage.docs)
  const terminal = new Set(stages.filter((stage) => isTerminalCategory(stage.category)).map((stage) => stage.id))
  const task = mapTask(doc, new Map<string, StageLabel>(stages.map((stage) => [stage.id, stage])))
  const [parent, canUpdate, related] = await Promise.all([
    loadParent(context, doc.parentTask),
    canEdit(context, task.id),
    loadRelated(context, doc),
  ])
  const subtasks = subtasksOf(subtaskPage.docs, terminal)
  return {
    related,
    task: sheetTask({ doc, task, parent, subtasks }),
    options: {
      stages,
      members: memberPage.docs.map(({ id, name }) => ({ id, name })),
      groups: groupPage.docs.map(({ id, name }) => ({ id, name })),
      canUpdate,
      canMarkOwnerOnly: canMarkTaskOwnerOnly(context.actor),
      locale,
    },
  }
}

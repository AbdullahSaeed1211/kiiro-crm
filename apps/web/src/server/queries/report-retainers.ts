import type { RequestContext } from '@/server/container'
import type { ReportRange } from './report-range'
import { todayAsDueAt } from '@ops/module-work'
import { getWorkspaceSettings } from '../auth/context'

export interface RetainerFigure {
  readonly id: string
  readonly name: string
  readonly recurringTasks: number
  readonly recurringDue: number
  readonly recurringOverdue: number
  readonly recurringUnassigned: number
  readonly loggedMinutes: number
  readonly loggedEntries: number
}

interface Figure {
  id: string
  name: string
  recurringTasks: number
  recurringDue: number
  recurringOverdue: number
  recurringUnassigned: number
  loggedMinutes: number
  loggedEntries: number
}
interface ProjectRow {
  id: string
  name: string
  customData?: unknown
}
interface TaskRow {
  id: string
  project?: unknown
  repeat?: unknown
  stageId?: unknown
  dueAt?: unknown
  assignees?: unknown
}
interface TimeRow {
  task?: unknown
  minutes?: unknown
}
interface WorkflowRow {
  stages?: unknown
}

const refId = (value: unknown): string => {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'string' ? id : ''
}

function isRetainer(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as Record<string, unknown>).retainer === true
}

function emptyFigure(project: ProjectRow): Figure {
  return {
    id: project.id,
    name: project.name,
    recurringTasks: 0,
    recurringDue: 0,
    recurringOverdue: 0,
    recurringUnassigned: 0,
    loggedMinutes: 0,
    loggedEntries: 0,
  }
}

async function loadRetainerProjects(context: RequestContext): Promise<Map<string, Figure>> {
  const found = await context.payload.find({
    collection: 'projects',
    select: { id: true, name: true, customData: true },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return new Map(
    (found.docs as ProjectRow[])
      .filter((project) => isRetainer(project.customData))
      .map((project) => [project.id, emptyFigure(project)]),
  )
}

async function finishedTaskStages(context: RequestContext): Promise<Set<string>> {
  const workflow = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    select: { stages: true },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  const stages: unknown[] = Array.isArray((workflow.docs[0] as WorkflowRow | undefined)?.stages)
    ? ((workflow.docs[0] as WorkflowRow).stages as unknown[])
    : []
  return new Set(
    stages.flatMap((stage) => {
      const item = stage as { id?: unknown; category?: unknown }
      return typeof item.id === 'string' &&
        ['done_success', 'done_failure', 'cancelled'].includes(String(item.category))
        ? [item.id]
        : []
    }),
  )
}

interface TaskLoadInput {
  readonly context: RequestContext
  readonly projects: Map<string, Figure>
  readonly range: ReportRange
  readonly today: number
}

interface HealthWindow {
  readonly range: ReportRange
  readonly today: number
}

function updateDueHealth(figure: Figure, dueAt: number | null, window: HealthWindow): void {
  if (dueAt === null) return
  if (dueAt >= window.range.from && dueAt < window.range.to) figure.recurringDue += 1
  if (dueAt < window.today) figure.recurringOverdue += 1
}

function updateRecurringHealth(figure: Figure, task: TaskRow, window: HealthWindow): void {
  const dueAt = typeof task.dueAt === 'number' ? task.dueAt : null
  updateDueHealth(figure, dueAt, window)
  if (!Array.isArray(task.assignees) || task.assignees.length === 0) figure.recurringUnassigned += 1
}

async function loadProjectTasks(
  input: TaskLoadInput,
): Promise<{ readonly taskProject: Map<string, string>; readonly recurringTaskIds: Set<string> }> {
  const { context, projects, range, today } = input
  const projectIds = [...projects.keys()]
  if (projectIds.length === 0) return { taskProject: new Map(), recurringTaskIds: new Set() }
  const finishedStages = await finishedTaskStages(context)
  const found = await context.payload.find({
    collection: 'tasks',
    where: { project: { in: projectIds } },
    select: { id: true, project: true, repeat: true, stageId: true, dueAt: true, assignees: true },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return indexProjectTasks(found.docs, { projects, range, today, finishedStages })
}

function indexProjectTasks(
  tasks: readonly TaskRow[],
  input: { projects: Map<string, Figure>; range: ReportRange; today: number; finishedStages: Set<string> },
): { readonly taskProject: Map<string, string>; readonly recurringTaskIds: Set<string> } {
  const result = { taskProject: new Map<string, string>(), recurringTaskIds: new Set<string>() }
  for (const task of tasks) indexProjectTask(task, input, result)
  return result
}

function indexProjectTask(
  task: TaskRow,
  input: { projects: Map<string, Figure>; range: ReportRange; today: number; finishedStages: Set<string> },
  result: { taskProject: Map<string, string>; recurringTaskIds: Set<string> },
): void {
  const projectId = refId(task.project)
  result.taskProject.set(task.id, projectId)
  if (task.repeat === 'none' || input.finishedStages.has(refId(task.stageId))) return
  result.recurringTaskIds.add(task.id)
  const figure = input.projects.get(projectId)
  if (figure !== undefined) updateRecurringHealth(figure, task, { range: input.range, today: input.today })
}

interface ActivityInput extends TaskLoadInput {
  readonly taskProject: Map<string, string>
  readonly recurringTaskIds: ReadonlySet<string>
}

function addRecurringTaskCounts(input: ActivityInput): void {
  for (const taskId of input.recurringTaskIds) {
    const projectId = input.taskProject.get(taskId)
    const figure = projectId === undefined ? undefined : input.projects.get(projectId)
    if (figure !== undefined) figure.recurringTasks += 1
  }
}

function addTimeEntries(input: ActivityInput, entries: readonly TimeRow[]): void {
  for (const entry of entries) {
    const projectId = input.taskProject.get(refId(entry.task))
    const figure = projectId === undefined ? undefined : input.projects.get(projectId)
    if (figure === undefined) continue
    figure.loggedMinutes += typeof entry.minutes === 'number' ? entry.minutes : 0
    figure.loggedEntries += 1
  }
}

async function loadTimeEntries(input: ActivityInput): Promise<TimeRow[]> {
  const { context, range, taskProject } = input
  if (taskProject.size === 0) return []
  const entries = await context.payload.find({
    collection: 'timeEntries',
    where: {
      and: [
        { day: { greater_than_equal: range.from } },
        { day: { less_than: range.to } },
        { task: { in: [...taskProject.keys()] } },
      ],
    },
    select: { task: true, minutes: true },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return entries.docs
}

async function addTaskAndTimeCounts(input: ActivityInput): Promise<void> {
  addRecurringTaskCounts(input)
  const entries = await loadTimeEntries(input)
  addTimeEntries(input, entries)
}

/** Manager-only retainer activity, from projects explicitly marked as retainers, recurring tasks and logged time. */
export async function loadRetainerFigures(context: RequestContext, range: ReportRange): Promise<RetainerFigure[]> {
  const projects = await loadRetainerProjects(context)
  const settings = await getWorkspaceSettings()
  const today = todayAsDueAt(Date.now(), typeof settings.timezone === 'string' ? settings.timezone : 'UTC')
  const taskLoad = { context, projects, range, today }
  const tasks = await loadProjectTasks(taskLoad)
  await addTaskAndTimeCounts({ ...taskLoad, ...tasks })
  return [...projects.values()].toSorted((a, b) => b.loggedMinutes - a.loggedMinutes || a.name.localeCompare(b.name))
}

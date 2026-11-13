import { isManagerUp } from '@ops/platform'
import { sameCalendarDayIn } from '@ops/module-work'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadWorkReadModel } from './read-models'

const TERMINAL = new Set(['done_success', 'done_failure', 'cancelled'])

export interface TeamAssignmentTask {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly currentWork: boolean
  readonly dueAt: number | null
  readonly projectId: string | null
  readonly projectName: string | null
}

export interface TeamAssignmentProject {
  readonly id: string
  readonly name: string
  readonly memberCount: number
  readonly targetEndAt: number | null
}

export interface TeamAssignmentMember {
  readonly id: string
  readonly name: string
  readonly tasks: readonly TeamAssignmentTask[]
}

export interface TeamAssignmentsModel {
  readonly locale: 'en' | 'es'
  readonly timeZone: string
  readonly members: readonly TeamAssignmentMember[]
  readonly unassignedTasks: readonly TeamAssignmentTask[]
  readonly ownerGapProjects: readonly TeamAssignmentProject[]
}

function taskItem(
  task: Readonly<{
    id: string
    title: string
    stage: string
    dueAt: number | null
    projectId: string | null
  }>,
  options: Readonly<{
    currentFocus: ReadonlySet<string>
    projectNames: ReadonlyMap<string, string>
    memberId: string | null
  }>,
): TeamAssignmentTask {
  const { currentFocus, projectNames, memberId } = options
  return {
    id: task.id,
    title: task.title,
    status: task.stage,
    currentWork: memberId !== null && currentFocus.has(`${memberId}:${task.id}`),
    dueAt: task.dueAt,
    projectId: task.projectId,
    projectName: task.projectId === null ? null : (projectNames.get(task.projectId) ?? null),
  }
}

function compareDue(
  left: Readonly<{ title: string; dueAt: number | null }>,
  right: Readonly<{ title: string; dueAt: number | null }>,
): number {
  if (left.dueAt === null) return right.dueAt === null ? left.title.localeCompare(right.title) : 1
  if (right.dueAt === null) return -1
  return left.dueAt - right.dueAt || left.title.localeCompare(right.title)
}

function memberRows({
  people,
  activeTasks,
  currentFocus,
  projectNames,
}: Readonly<{
  people: ReadonlyMap<string, string>
  activeTasks: ReturnType<typeof activeTasksOf>
  currentFocus: ReadonlySet<string>
  projectNames: ReadonlyMap<string, string>
}>): TeamAssignmentMember[] {
  return [...people]
    .map(([id, name]) => {
      const assignedTasks = activeTasks
        .filter((task) => task.assigneeIds.includes(id))
        .map((task) => taskItem(task, { currentFocus, projectNames, memberId: id }))
      return {
        id,
        name,
        tasks: assignedTasks,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function activeTasksOf(model: Awaited<ReturnType<typeof loadWorkReadModel>>) {
  return model.tasks.filter((task) => !TERMINAL.has(task.stageCategory))
}

function activeProjectsOf(model: Awaited<ReturnType<typeof loadWorkReadModel>>) {
  return model.projects.filter((project) => !TERMINAL.has(project.stageCategory))
}

/** Owner/manager overview of active assignments, based on the same access-scoped work reads as other pages. */
export async function loadTeamAssignments(context?: RequestContext): Promise<TeamAssignmentsModel | undefined> {
  const requestContext = context ?? (await getRequestContext())
  if (!isManagerUp(requestContext.actor)) return undefined

  const model = await loadWorkReadModel(requestContext, 'assignments')
  const projectNames = new Map(model.projects.map((project) => [project.id, project.name] as const))
  const activeProjects = activeProjectsOf(model)
  const activeTasks = activeTasksOf(model)
  const currentFocus = await loadTeamFocus(requestContext, model)
  const members = memberRows({ people: model.people, activeTasks, currentFocus, projectNames })

  const unassignedTasks = activeTasks
    .filter((task) => task.assigneeIds.length === 0)
    .map((task) => taskItem(task, { currentFocus, projectNames, memberId: null }))
    .sort(compareDue)
  const ownerGapProjects = activeProjects
    .filter((project) => project.ownerId === null)
    .map((project) => ({
      id: project.id,
      name: project.name,
      memberCount: project.memberIds.length,
      targetEndAt: project.targetEndAt,
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    locale: model.locale,
    timeZone: model.timeZone,
    members,
    unassignedTasks,
    ownerGapProjects,
  }
}

function relationshipId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value !== 'object' || value === null) return null
  const id: unknown = Reflect.get(value, 'id')
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

async function loadTeamFocus(requestContext: RequestContext, model: Awaited<ReturnType<typeof loadWorkReadModel>>) {
  const focusPage = await requestContext.payload.find({
    collection: 'currentFocus',
    where: { user: { in: [...model.people.keys()] } },
    select: { user: true, task: true, startedAt: true },
    limit: Math.max(model.people.size, 1),
    depth: 0,
    // The manager-gated page intersects these focus rows with active, access-scoped tasks below.
    overrideAccess: true,
    req: requestContext.req,
  })
  return new Set(
    focusPage.docs.flatMap((doc) => {
      const userId = relationshipId(doc.user)
      const taskId = relationshipId(doc.task)
      const startedAt = Reflect.get(doc, 'startedAt')
      const isToday =
        typeof startedAt === 'number' &&
        sameCalendarDayIn({
          first: startedAt,
          second: Date.now(),
          timeZone: model.timeZone,
        })
      return userId === null || taskId === null || !isToday ? [] : [`${userId}:${taskId}`]
    }),
  )
}

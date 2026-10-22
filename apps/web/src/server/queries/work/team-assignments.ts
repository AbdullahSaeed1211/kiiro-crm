import { isManagerUp } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadWorkReadModel } from './read-models'

const TERMINAL = new Set(['done_success', 'done_failure', 'cancelled'])

export interface TeamAssignmentTask {
  readonly id: string
  readonly title: string
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

interface TeamAssignmentDue {
  readonly kind: 'task' | 'project'
  readonly id: string
  readonly title: string
  readonly dueAt: number
}

export interface TeamAssignmentMember {
  readonly id: string
  readonly name: string
  readonly openTaskCount: number
  readonly openProjectCount: number
  readonly nextDue: TeamAssignmentDue | null
}

export interface TeamAssignmentsModel {
  readonly locale: 'en' | 'es'
  readonly timeZone: string
  readonly members: readonly TeamAssignmentMember[]
  readonly unassignedTasks: readonly TeamAssignmentTask[]
  readonly ownerGapProjects: readonly TeamAssignmentProject[]
}

function taskItem(
  task: Readonly<{ id: string; title: string; dueAt: number | null; projectId: string | null }>,
  projectNames: ReadonlyMap<string, string>,
): TeamAssignmentTask {
  return {
    id: task.id,
    title: task.title,
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

function nextDueForMember(
  tasks: readonly TeamAssignmentTask[],
  projects: ReturnType<typeof activeProjectsOf>,
): TeamAssignmentDue | null {
  const datedTasks = tasks
    .filter((task): task is TeamAssignmentTask & { dueAt: number } => task.dueAt !== null)
    .map((task) => ({ kind: 'task' as const, id: task.id, title: task.title, dueAt: task.dueAt }))
  const datedProjects = projects
    .filter((project): project is typeof project & { targetEndAt: number } => project.targetEndAt !== null)
    .map((project) => ({ kind: 'project' as const, id: project.id, title: project.name, dueAt: project.targetEndAt }))
  return [...datedTasks, ...datedProjects].sort(compareDue)[0] ?? null
}

function memberRows({
  people,
  activeTasks,
  activeProjects,
  projectNames,
}: Readonly<{
  people: ReadonlyMap<string, string>
  activeTasks: ReturnType<typeof activeTasksOf>
  activeProjects: ReturnType<typeof activeProjectsOf>
  projectNames: ReadonlyMap<string, string>
}>): TeamAssignmentMember[] {
  return [...people]
    .map(([id, name]) => {
      const assignedTasks = activeTasks
        .filter((task) => task.assigneeIds.includes(id))
        .map((task) => taskItem(task, projectNames))
      const memberProjects = activeProjects.filter(
        (project) => project.ownerId === id || project.memberIds.includes(id),
      )
      return {
        id,
        name,
        openTaskCount: assignedTasks.length,
        openProjectCount: memberProjects.length,
        nextDue: nextDueForMember(assignedTasks, memberProjects),
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
  const members = memberRows({ people: model.people, activeTasks, activeProjects, projectNames })

  const unassignedTasks = activeTasks
    .filter((task) => task.assigneeIds.length === 0)
    .map((task) => taskItem(task, projectNames))
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

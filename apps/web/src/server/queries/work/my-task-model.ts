import { getWorkspaceSettings } from '../../auth/context'
import { getRequestContext, type RequestContext } from '@/server/container'
import { normalizeLocale } from '../../../i18n/config'
import {
  addStages,
  mapTask,
  text,
  value,
  workflowStages,
  type StageLabel,
  type WorkListTask,
  type WorkReadModel,
} from './read-models'

const TEAM_TASK_LIMIT = 100
const FINISHED: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])

/** The signed-in user's tasks with what My tasks needs to render them. */
export type MyTaskModel = Pick<WorkReadModel, 'tasks' | 'actorId' | 'timeZone' | 'stages' | 'locale'> & {
  /** Name of each project the tasks belong to, by project id. */
  readonly projectNames: Readonly<Record<string, string>>
  /** Open tasks of the person's groups that nobody has taken yet. */
  readonly teamTasks: readonly WorkListTask[]
}

/** Names of the projects with these ids, for labelling tasks; an empty list reads nothing. */
async function projectNamesFor(
  context: RequestContext,
  projectIds: readonly string[],
): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {}
  const found = await context.payload.find({
    collection: 'projects',
    where: { id: { in: [...projectIds] } },
    select: { name: true },
    limit: projectIds.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return Object.fromEntries(found.docs.map((project) => [project.id, project.name]))
}

/** Open tasks that belong to one of the person's groups and have no assignee yet, soonest due first. */
async function loadTeamTasks(
  context: RequestContext,
  stages: ReadonlyMap<string, StageLabel>,
): Promise<readonly WorkListTask[]> {
  const groupIds = context.actor.groupIds.map(String)
  if (groupIds.length === 0) return []
  const found = await context.payload.find({
    collection: 'tasks',
    where: { group: { in: groupIds } },
    sort: ['dueAt', 'id'],
    limit: TEAM_TASK_LIMIT,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return (found.docs as readonly object[])
    .map((doc) => mapTask(doc, stages))
    .filter((task) => task.assigneeIds.length === 0 && !FINISHED.has(task.stageCategory))
}

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
  const tasks = (taskPage.docs as readonly object[]).map((doc) => mapTask(doc, stages))
  const teamTasks = await loadTeamTasks(requestContext, stages)
  const projectIds = [
    ...new Set([...tasks, ...teamTasks].flatMap((task) => (task.projectId === null ? [] : [task.projectId]))),
  ]
  return {
    tasks,
    teamTasks,
    projectNames: await projectNamesFor(requestContext, projectIds),
    actorId: String(requestContext.actor.id),
    timeZone: text(settings, 'timezone') || 'UTC',
    stages: workflowStages(workflows),
    locale: normalizeLocale(value(settings, 'locale')),
  }
}

/** Loads one scoped project and its task rows. */

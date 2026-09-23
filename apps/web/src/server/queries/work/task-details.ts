import { getRequestContext, type RequestContext } from '../../work/deps'
import { addStages, mapTask, type StageLabel, type WorkListTask } from './read-models'

/** Loads one scoped task and its workflow labels without reading workspace-wide work records. */
export async function loadTask(idValue: string, context?: RequestContext): Promise<WorkListTask | undefined> {
  const requestContext = context ?? (await getRequestContext())
  const request = { depth: 0, limit: 1, pagination: false, overrideAccess: false as const, req: requestContext.req }
  const [taskPage, workflowPage] = await Promise.all([
    requestContext.payload.find({
      collection: 'tasks',
      ...request,
      where: { id: { equals: idValue } },
      select: {
        id: true,
        title: true,
        stageId: true,
        priority: true,
        description: true,
        startAt: true,
        assignees: true,
        project: true,
        dueAt: true,
        completedAt: true,
        updatedAt: true,
      },
    }),
    requestContext.payload.find({
      collection: 'workflows',
      ...request,
      limit: 0,
      where: { recordType: { equals: 'task' } },
    }),
  ])
  const taskDocument = taskPage.docs.at(0)
  if (taskDocument === undefined) return undefined
  const stages = new Map<string, StageLabel>()
  for (const workflow of workflowPage.docs as readonly object[]) addStages(stages, workflow)
  return mapTask(taskDocument, stages)
}

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

import type { RequestContext } from '../../container'

/** D1 binds at most 100 variables per statement, so project ids are looked up in chunks. */
const ID_CHUNK = 80

export interface Progress {
  readonly done: number
  readonly total: number
}

/** Tasks done out of all tasks for each of the given projects, reading only those projects' tasks. */
export async function loadProjectProgress(
  context: RequestContext,
  input: { readonly projectIds: readonly string[]; readonly doneStageIds: ReadonlySet<string> },
): Promise<ReadonlyMap<string, Progress>> {
  const counts = new Map<string, { done: number; total: number }>()
  for (let at = 0; at < input.projectIds.length; at += ID_CHUNK) {
    const found = await context.payload.find({
      collection: 'tasks',
      where: { project: { in: input.projectIds.slice(at, at + ID_CHUNK) } },
      select: { stageId: true, project: true },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    for (const task of found.docs) {
      const project = typeof task.project === 'string' ? task.project : ''
      const entry = counts.get(project) ?? { done: 0, total: 0 }
      entry.total += 1
      if (typeof task.stageId === 'string' && input.doneStageIds.has(task.stageId)) entry.done += 1
      counts.set(project, entry)
    }
  }
  return counts
}

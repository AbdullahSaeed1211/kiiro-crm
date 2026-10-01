import { listTaskPage } from '@ops/adapter-payload'
import { ok, type Result } from '@ops/kernel'
import type { ProjectRecord, TaskRecord } from '@ops/module-work'
import type { Where } from 'payload'
import { workCommandDeps, type RequestContext } from '@/server/container'
import { pageOf, pageWindowOf, type PageOf } from './page-window'

/** `?q=` (title), `?stageId=`, `?assigneeId=` and `?projectId=` narrow the task list. */
function taskFilters(url: URL): Where {
  const clauses: Where[] = []
  const param = (name: string): string | undefined => {
    const value = url.searchParams.get(name)
    return value === null || value === '' ? undefined : value
  }
  const q = param('q')
  if (q !== undefined) clauses.push({ title: { contains: q } })
  const stageId = param('stageId')
  if (stageId !== undefined) clauses.push({ stageId: { equals: stageId } })
  const assigneeId = param('assigneeId')
  if (assigneeId !== undefined) clauses.push({ assignees: { in: [assigneeId] } })
  const projectId = param('projectId')
  if (projectId !== undefined) clauses.push({ project: { equals: projectId } })
  return clauses.length === 0 ? {} : { and: clauses }
}

/** One page of the tasks the actor may see, in rank order, for `GET /api/v1/tasks`. */
export async function listTaskRecords(context: RequestContext, url: URL): Promise<Result<PageOf<TaskRecord>>> {
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await listTaskPage(context.req, {
    where: taskFilters(url),
    sort: ['rank', 'id'],
    page: window.value.page,
    limit: window.value.limit,
  })
  return ok(pageOf(found, window.value))
}

/** One page of the projects the actor may see, by name, for `GET /api/v1/projects`. */
export async function listProjectRecords(context: RequestContext, url: URL): Promise<Result<PageOf<ProjectRecord>>> {
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const found = await (await workCommandDeps(context)).repo.listProjectsPage(window.value.page, window.value.limit)
  return ok(pageOf(found, window.value))
}

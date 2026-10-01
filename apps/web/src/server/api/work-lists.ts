import { listTaskPage } from '@ops/adapter-payload'
import { ok, type Result } from '@ops/kernel'
import type { ProjectRecord, TaskRecord } from '@ops/module-work'
import { workCommandDeps, type RequestContext } from '@/server/container'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

interface Page<T> {
  readonly records: readonly T[]
  readonly total: number
  readonly page: number
}

/** `page` and `limit` from the query string: page 1 and 50 rows unless asked, and never more than 100 rows. */
function windowOf(url: URL): { page: number; limit: number } {
  return {
    page: Math.max(1, Number(url.searchParams.get('page')) || 1),
    limit: Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT)),
  }
}

/** One page of the tasks the actor may see, in rank order, for `GET /api/v1/tasks`. */
export async function listTaskRecords(context: RequestContext, url: URL): Promise<Result<Page<TaskRecord>>> {
  const { page, limit } = windowOf(url)
  const found = await listTaskPage(context.req, { where: {}, sort: ['rank', 'id'], page, limit })
  return ok({ ...found, page })
}

/** One page of the projects the actor may see, by name, for `GET /api/v1/projects`. */
export async function listProjectRecords(context: RequestContext, url: URL): Promise<Result<Page<ProjectRecord>>> {
  const { page, limit } = windowOf(url)
  const found = await (await workCommandDeps(context)).repo.listProjectsPage(page, limit)
  return ok({ ...found, page })
}

import { createTask } from '@ops/module-work'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listTaskRecords } from '../../../../server/api/work-lists'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.list` */
export const GET = apiRoute(async ({ request, context }) => listTaskRecords(context, new URL(request.url)))

/** `tasks.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'tasks.create')
  return body.ok ? createTask(await workCommandDeps(context), body.value) : body
}, 201)

import { createProject } from '@ops/module-work'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { listProjectRecords } from '../../../../server/api/work-lists'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `projects.list` */
export const GET = apiRoute(async ({ request, context }) => listProjectRecords(context, new URL(request.url)))

/** `projects.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'projects.create')
  return body.ok ? createProject(await workCommandDeps(context), body.value) : body
}, 201)

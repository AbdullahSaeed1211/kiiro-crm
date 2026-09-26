import { ok } from '@ops/kernel'
import { createProject } from '@ops/module-work'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `projects.list` */
export const GET = apiRoute(async ({ context }) => ok(await (await workCommandDeps(context)).repo.listProjects()))

/** `projects.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'projects.create')
  return body.ok ? createProject(await workCommandDeps(context), body.value) : body
}, 201)

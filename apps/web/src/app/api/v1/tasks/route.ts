import { createTask } from '@ops/module-work'
import { ok } from '@ops/kernel'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { getWorkCommandDeps } from '../../../../server/work/command-deps'

export const dynamic = 'force-dynamic'

/** `tasks.list` */
export const GET = apiRoute(async ({ context }) => ok(await (await getWorkCommandDeps(context)).repo.listTasks()))

/** `tasks.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'tasks.create')
  return body.ok ? createTask(await getWorkCommandDeps(context), body.value) : body
}, 201)

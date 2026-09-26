import { asId, domainError, err, ok } from '@ops/kernel'
import { updateTask } from '@ops/module-work'
import { contractBody } from '../../../../../server/api/contracts'
import { apiRoute } from '../../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.get` */
export const GET = apiRoute<{ id: string }>(async ({ params, context }) => {
  const task = await (await workCommandDeps(context)).repo.getTask(asId(params.id))
  return task === undefined ? err(domainError('NOT_FOUND', 'task not found')) : ok(task)
})

/** `tasks.update` */
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.update')
  return body.ok ? updateTask(await workCommandDeps(context), { ...body.value, taskId: params.id }) : body
})

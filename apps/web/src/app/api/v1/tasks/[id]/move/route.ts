import { moveTask } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { getWorkCommandDeps } from '../../../../../../server/work/command-deps'

export const dynamic = 'force-dynamic'

/** `tasks.move` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.move')
  return body.ok ? moveTask(await getWorkCommandDeps(context), { ...body.value, taskId: params.id }) : body
})

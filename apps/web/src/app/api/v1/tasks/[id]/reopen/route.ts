import { asId } from '@ops/kernel'
import { reopenTask } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.reopen` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.reopen')
  if (!body.ok) return body
  return reopenTask(await workCommandDeps(context), asId(params.id), body.value.expectedUpdatedAt)
})

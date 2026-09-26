import { asId } from '@ops/kernel'
import { completeTask } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.complete` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.complete')
  if (!body.ok) return body
  return completeTask(await workCommandDeps(context), asId(params.id), body.value.expectedUpdatedAt)
})

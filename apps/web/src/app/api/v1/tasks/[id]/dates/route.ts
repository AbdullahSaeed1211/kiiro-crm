import { asId } from '@ops/kernel'
import { setTaskDates } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { getWorkCommandDeps } from '../../../../../../server/work/command-deps'

export const dynamic = 'force-dynamic'

/** `tasks.dates` */
export const PUT = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.dates')
  if (!body.ok) return body
  return setTaskDates(await getWorkCommandDeps(context), { ...body.value, taskId: asId(params.id) })
})

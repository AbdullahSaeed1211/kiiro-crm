import { carryTaskToNextDay } from '@ops/module-work'
import { contractBody } from '../../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../../server/api/http'
import { getWorkspaceSettings } from '@/server/auth/context'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.plan.carry` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.plan.carry')
  if (!body.ok) return body
  const [deps, settings] = await Promise.all([workCommandDeps(context), getWorkspaceSettings()])
  return carryTaskToNextDay(
    deps,
    { ...body.value, taskId: params.id },
    typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
  )
})

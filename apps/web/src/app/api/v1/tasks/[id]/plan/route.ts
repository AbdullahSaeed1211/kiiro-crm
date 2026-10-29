import { addTaskToTodayPlan, removeTaskFromTodayPlan } from '@ops/module-work'
import { contractBody } from '../../../../../../server/api/contracts'
import { apiRoute } from '../../../../../../server/api/http'
import { getWorkspaceSettings } from '@/server/auth/context'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `tasks.plan.add` */
export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'tasks.plan.add')
  if (!body.ok) return body
  const [deps, settings] = await Promise.all([workCommandDeps(context), getWorkspaceSettings()])
  return addTaskToTodayPlan(
    deps,
    { ...body.value, taskId: params.id },
    typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
  )
})

/** `tasks.plan.remove` */
export const DELETE = apiRoute<{ id: string }>(async ({ params, context }) => {
  const [deps, settings] = await Promise.all([workCommandDeps(context), getWorkspaceSettings()])
  return removeTaskFromTodayPlan(
    deps,
    { taskId: params.id },
    typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
  )
})

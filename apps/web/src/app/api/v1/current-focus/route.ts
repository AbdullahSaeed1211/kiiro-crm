import { setCurrentFocus } from '@ops/module-work'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `current-focus.set` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'current-focus.set')
  return body.ok ? setCurrentFocus(await workCommandDeps(context), body.value) : body
})

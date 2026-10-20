import { updateContentItem } from '@ops/module-work'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'
export const PATCH = apiRoute<{ id: string }>(async ({ request, params, context }) => {
  const body = await contractBody(request, 'content.update')
  return body.ok ? updateContentItem(await workCommandDeps(context), { ...body.value, contentItemId: params.id }) : body
})

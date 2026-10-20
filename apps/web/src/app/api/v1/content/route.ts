import { createContentItem, listContentItems } from '@ops/module-work'
import { contractBody } from '@/server/api/contracts'
import { apiRoute } from '@/server/api/http'
import { workCommandDeps } from '@/server/container'

export const dynamic = 'force-dynamic'
export const GET = apiRoute(async ({ request, context }) => {
  const url = new URL(request.url)
  const from = Number(url.searchParams.get('from'))
  const to = Number(url.searchParams.get('to'))
  const projectId = url.searchParams.get('projectId') ?? undefined
  return listContentItems(await workCommandDeps(context), {
    from,
    to,
    ...(projectId === undefined ? {} : { projectId }),
  })
})
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'content.create')
  return body.ok ? createContentItem(await workCommandDeps(context), body.value) : body
}, 201)

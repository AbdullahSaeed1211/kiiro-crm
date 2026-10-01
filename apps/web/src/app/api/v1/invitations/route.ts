import { listInvitationRecords } from '../../../../server/api/identity-lists'
import { inviteMember } from '@ops/module-identity'
import { ok } from '@ops/kernel'
import { invitationUrl } from '../../../../server/auth/invitation-url'
import { contractBody } from '../../../../server/api/contracts'
import { apiRoute } from '../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `invitations.create` */
export const POST = apiRoute(async ({ request, context }) => {
  const body = await contractBody(request, 'invitations.create')
  if (!body.ok) return body
  const result = await inviteMember(await identityDeps(context), body.value)
  return result.ok ? ok({ inviteUrl: invitationUrl(result.value.token) }) : result
}, 201)

/** `invitations.list` */
export const GET = apiRoute(({ request, context }) => listInvitationRecords(context, new URL(request.url)))

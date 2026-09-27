import { resendInvitation } from '@ops/module-identity'
import { ok } from '@ops/kernel'
import { invitationUrl } from '../../../../../../server/auth/invitation-url'
import { apiRoute } from '../../../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `invitations.resend` */
export const POST = apiRoute<{ id: string }>(async ({ params, context }) => {
  const result = await resendInvitation(await identityDeps(context), { id: params.id })
  return result.ok ? ok({ inviteUrl: invitationUrl(result.value.token) }) : result
})

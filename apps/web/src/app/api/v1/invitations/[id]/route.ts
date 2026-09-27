import { revokeInvitation } from '@ops/module-identity'
import { apiRoute } from '../../../../../server/api/http'
import { identityDeps } from '@/server/container'

export const dynamic = 'force-dynamic'

/** `invitations.revoke` */
export const DELETE = apiRoute<{ id: string }>(async ({ params, context }) =>
  revokeInvitation(await identityDeps(context), { id: params.id }),
)

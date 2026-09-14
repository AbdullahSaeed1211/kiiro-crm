import { payloadData, payloadForAuth } from '../../../../server/auth/api'
import { AuthForm } from '../../auth-form'

export const dynamic = 'force-dynamic'

export default async function InvitationPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const token = (await params).token
  const payload = await payloadForAuth()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const result = await payloadData(payload).find({
    collection: 'invitations',
    where: { tokenHash: { equals: tokenHash } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const invitation = result.docs[0]
  if (
    invitation?.status !== 'pending' ||
    typeof invitation.expiresAt !== 'number' ||
    invitation.expiresAt <= Date.now()
  ) {
    return (
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This invitation is expired, revoked, or already accepted.</p>
      </div>
    )
  }
  const inviter =
    typeof invitation.invitedBy === 'object' && invitation.invitedBy !== null
      ? (invitation.invitedBy as Record<string, unknown>).name
      : undefined
  return (
    <div className="w-full">
      <div className="mx-auto mb-4 max-w-sm text-center">
        <p className="text-sm text-muted-foreground">
          {typeof inviter === 'string' ? `${inviter} invited you` : 'You were invited'}
        </p>
        <p className="text-sm text-muted-foreground">Role: {String(invitation.role)}</p>
      </div>
      <AuthForm
        endpoint="/api/v1/invitations/accept"
        submitLabel="Accept invitation"
        fields={['name', 'password', 'confirm']}
        hidden={{ token }}
      />
    </div>
  )
}

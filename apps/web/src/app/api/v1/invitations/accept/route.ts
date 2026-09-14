import {
  bodyOf,
  errorResponse,
  jsonWithCookie,
  payloadData,
  payloadForAuth,
  stringOf,
} from '../../../../../server/auth/api'

async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function validPassword(password: string, email: string): boolean {
  return password.length >= 12 && password.length <= 128 && password.toLowerCase() !== email.toLowerCase()
}

function invalidInvitation(invitation: Record<string, unknown> | undefined): Response | undefined {
  if (invitation === undefined) return Response.json({ error: 'Invitation not found.' }, { status: 404 })
  if (invitation.status !== 'pending')
    return Response.json({ error: 'This invitation has already been used or revoked.' }, { status: 409 })
  if (typeof invitation.expiresAt !== 'number' || invitation.expiresAt <= Date.now())
    return Response.json({ error: 'This invitation has expired.' }, { status: 409 })
  return undefined
}

interface InvitationCompletion {
  readonly payload: Awaited<ReturnType<typeof payloadForAuth>>
  readonly dataPayload: ReturnType<typeof payloadData>
  readonly invitation: Record<string, unknown>
  readonly email: string
  readonly password: string
  readonly name: string
}
async function finishInvitation({
  payload,
  dataPayload,
  invitation,
  email,
  password,
  name,
}: InvitationCompletion): Promise<Response> {
  const role =
    invitation.role === 'owner' || invitation.role === 'manager' || invitation.role === 'staff'
      ? invitation.role
      : 'staff'
  const user = await dataPayload.create({
    collection: 'users',
    data: { email, password, name, role, active: true, groups: invitation.groups, reportsTo: invitation.reportsTo },
    overrideAccess: true,
  })
  await dataPayload.update({
    collection: 'invitations',
    id: invitation.id,
    data: { status: 'accepted', acceptedAt: Date.now() },
    overrideAccess: true,
  })
  const login = await payload.login({ collection: 'users', data: { email, password } })
  if (typeof login.token !== 'string') throw new Error('Invitation acceptance did not return a session token.')
  return jsonWithCookie(payload, login.token, { redirect: role === 'owner' ? '/onboarding' : '/', userId: user.id })
}

interface InvitationInput {
  readonly payload: Awaited<ReturnType<typeof payloadForAuth>>
  readonly token: string
  readonly name: string
  readonly password: string
}
async function acceptInvitation({ payload, token, name, password }: InvitationInput): Promise<Response> {
  const tokenHash = await hashInvitationToken(token)
  const dataPayload = payloadData(payload)
  const invitations = await dataPayload.find({
    collection: 'invitations',
    where: { tokenHash: { equals: tokenHash } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const invitation = invitations.docs[0]
  const invalid = invalidInvitation(invitation)
  if (invalid !== undefined) return invalid
  const currentInvitation: Record<string, unknown> = invitation ?? {}
  const email = typeof currentInvitation.email === 'string' ? currentInvitation.email.toLowerCase() : ''
  if (!validPassword(password, email))
    return Response.json(
      { error: 'Password must be 12 to 128 characters and must not equal the email address.' },
      { status: 400 },
    )
  return finishInvitation({ payload, dataPayload, invitation: currentInvitation, email, password, name })
}

export async function POST(request: Request): Promise<Response> {
  const body = await bodyOf(request)
  const token = stringOf(body, 'token')
  const name = stringOf(body, 'name')
  const password = stringOf(body, 'password')
  if (token === undefined || name === undefined || password === undefined)
    return Response.json({ error: 'Token, name and password are required.' }, { status: 400 })
  try {
    return await acceptInvitation({ payload: await payloadForAuth(), token, name, password })
  } catch (error) {
    return errorResponse(error, 'The invitation could not be accepted.')
  }
}

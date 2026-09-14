/* eslint-disable complexity, max-lines-per-function, max-params, max-statements, sonarjs/cognitive-complexity, @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison */
import { createUnitOfWork } from '@ops/adapter-payload'
import {
  authBody,
  errorResponse,
  jsonWithCookie,
  payloadData,
  payloadForAuth,
  passwordPolicyResponse,
  stringOf,
  type UntypedPayload,
  type UntypedPayloadDocument,
} from '../../../../../server/auth/api'
import { createLocalReq, type PayloadRequest } from 'payload'

function hashInvitationToken(token: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(token))
    .then((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''))
}

function docsOf(result: UntypedPayloadDocument | { docs: UntypedPayloadDocument[] }): UntypedPayloadDocument[] {
  if (typeof result === 'object' && result !== null && 'docs' in result && Array.isArray(result.docs))
    return result.docs as UntypedPayloadDocument[]
  return [result as UntypedPayloadDocument]
}

function invalidInvitation(invitation: UntypedPayloadDocument | undefined): Response | undefined {
  if (invitation === undefined) return Response.json({ error: 'Invitation not found.' }, { status: 404 })
  if (invitation.status === 'accepted' || invitation.status === 'revoked' || invitation.status === 'expired')
    return Response.json({ error: 'This invitation has already been used or revoked.' }, { status: 409 })
  if (typeof invitation.expiresAt !== 'number' || invitation.expiresAt <= Date.now())
    return Response.json({ error: 'This invitation has expired.' }, { status: 409 })
  return undefined
}

async function findInvitation(
  dataPayload: UntypedPayload,
  tokenHash: string,
  req: PayloadRequest,
): Promise<UntypedPayloadDocument | undefined> {
  const result = await dataPayload.find({
    collection: 'invitations',
    where: { tokenHash: { equals: tokenHash } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return result.docs[0]
}

async function claimInvitation(
  dataPayload: UntypedPayload,
  tokenHash: string,
  req: PayloadRequest,
  initial?: UntypedPayloadDocument,
): Promise<UntypedPayloadDocument | Response> {
  const initialDocument = initial ?? (await findInvitation(dataPayload, tokenHash, req))
  const invalid = invalidInvitation(initialDocument)
  if (invalid !== undefined) return invalid
  if (initialDocument?.status === 'accepting' && initialDocument.claimId !== tokenHash)
    return Response.json({ error: 'This invitation is already being accepted.' }, { status: 409 })
  if (initialDocument?.status === 'pending') {
    const claimed = await dataPayload.update({
      collection: 'invitations',
      where: { and: [{ id: { equals: initialDocument.id } }, { status: { equals: 'pending' } }] },
      limit: 1,
      data: { status: 'accepting', claimId: tokenHash, claimedAt: Date.now() },
      overrideAccess: true,
      req,
    })
    const claimedDoc = docsOf(claimed)[0]
    if (claimedDoc !== undefined) return claimedDoc
    const current = await findInvitation(dataPayload, tokenHash, req)
    if (current?.status !== 'accepting' || current.claimId !== tokenHash)
      return Response.json({ error: 'This invitation is already being accepted.' }, { status: 409 })
    return current
  }
  return initialDocument ?? Response.json({ error: 'Invitation not found.' }, { status: 404 })
}

function roleOf(invitation: UntypedPayloadDocument): 'owner' | 'manager' | 'staff' {
  return invitation.role === 'owner' || invitation.role === 'manager' || invitation.role === 'staff'
    ? invitation.role
    : 'staff'
}

async function findUser(
  dataPayload: UntypedPayload,
  email: string,
  req: PayloadRequest,
): Promise<UntypedPayloadDocument | undefined> {
  const result = await dataPayload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return result.docs[0]
}

async function finishInvitation({
  payload,
  dataPayload,
  invitation,
  email,
  password,
  name,
  req,
}: Readonly<{
  payload: Awaited<ReturnType<typeof payloadForAuth>>
  dataPayload: UntypedPayload
  invitation: UntypedPayloadDocument
  email: string
  password: string
  name: string
  req: PayloadRequest
}>): Promise<Response> {
  const role = roleOf(invitation)
  let user = await findUser(dataPayload, email, req)
  if (user !== undefined && user.invitationId !== invitation.id)
    return Response.json({ error: 'An account already exists for this email.' }, { status: 409 })
  if (user === undefined) {
    try {
      user = await dataPayload.create({
        collection: 'users',
        data: {
          email,
          password,
          name,
          role,
          active: true,
          groups: invitation.groups,
          reportsTo: invitation.reportsTo,
          invitationId: invitation.id,
        },
        overrideAccess: true,
        context: { authOperation: 'invitation' },
        req,
      })
    } catch (error) {
      user = await findUser(dataPayload, email, req)
      if (user?.invitationId !== invitation.id) throw error
    }
  }
  const completed = await dataPayload.update({
    collection: 'invitations',
    where: {
      and: [
        { id: { equals: invitation.id } },
        { status: { equals: 'accepting' } },
        { claimId: { equals: invitation.claimId } },
      ],
    },
    limit: 1,
    data: { status: 'accepted', acceptedAt: Date.now() },
    overrideAccess: true,
    req,
  })
  if (docsOf(completed)[0] === undefined) {
    const current = await findInvitation(dataPayload, String(invitation.tokenHash), req)
    if (current?.status === 'accepted')
      return Response.json({ error: 'This invitation has already been accepted.' }, { status: 409 })
    return Response.json({ error: 'This invitation could not be completed.' }, { status: 409 })
  }
  const login = await payload.login({ collection: 'users', data: { email, password } })
  if (typeof login.token !== 'string') throw new Error('Invitation acceptance did not return a session token.')
  return jsonWithCookie(payload, login.token, { redirect: role === 'owner' ? '/onboarding' : '/', userId: user?.id })
}

async function acceptInvitation({
  payload,
  token,
  name,
  password,
}: Readonly<{
  payload: Awaited<ReturnType<typeof payloadForAuth>>
  token: string
  name: string
  password: string
}>): Promise<Response> {
  const tokenHash = await hashInvitationToken(token)
  const req = await createLocalReq({ context: { authOperation: 'invitation' } }, payload)
  const dataPayload = payloadData(payload)
  const initial = await findInvitation(dataPayload, tokenHash, req)
  const initialError = invalidInvitation(initial)
  if (initialError !== undefined) return initialError
  const initialEmail = typeof initial?.email === 'string' ? initial.email.toLowerCase() : ''
  const passwordError = passwordPolicyResponse(password, initialEmail)
  if (passwordError !== undefined) return passwordError
  return createUnitOfWork(req).run(async () => {
    const invitation = await claimInvitation(dataPayload, tokenHash, req, initial)
    if (invitation instanceof Response) return invitation
    const email = typeof invitation.email === 'string' ? invitation.email.toLowerCase() : ''
    return finishInvitation({ payload, dataPayload, invitation, email, password, name, req })
  })
}

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
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

import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { rejectUnauthorized } from '@ops/adapter-cloudflare'
import { PEOPLE_COLLECTIONS } from '@ops/adapter-payload'
import { getPayload } from 'payload'
import { createOwnerInvitation } from '../route'

/**
 * Operator recovery for a lost owner invitation: replaces any pending invitation for `email` with a new one and
 * returns its link. Refuses when that person already has an account, so it cannot take over an existing user.
 */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const body: unknown = await request.json().catch(() => undefined)
  const email: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'email') : undefined
  const address = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!/^[^@\s]+@[^@\s]+$/u.test(address)) return Response.json({ error: 'send the owner email' }, { status: 400 })
  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: address } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs.length > 0) return Response.json({ error: 'that person already has an account' }, { status: 409 })
  await payload.update({
    collection: PEOPLE_COLLECTIONS.invitations,
    where: { and: [{ email: { equals: address } }, { status: { equals: 'pending' } }] },
    data: { status: 'revoked' },
    depth: 0,
    overrideAccess: true,
  })
  return Response.json({ inviteUrl: await createOwnerInvitation(payload, address) })
}

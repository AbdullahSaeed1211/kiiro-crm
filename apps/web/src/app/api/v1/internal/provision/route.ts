import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { rejectUnauthorized } from '@ops/adapter-cloudflare'
import {
  COLLECTIONS,
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  PEOPLE_COLLECTIONS,
  SETTINGS_GLOBAL,
} from '@ops/adapter-payload'
import { getPayload } from 'payload'
import { mergeAppliedTemplates, provisionBody, type ProvisionBody } from './helpers'

const BODY_LIMIT = 16_384

async function hasExistingOwnerState(payload: Awaited<ReturnType<typeof getPayload>>, email: string): Promise<boolean> {
  const existingUser = await payload.find({
    collection: COLLECTIONS.users,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existingUser.docs.length > 0) return true

  const invitations = await payload.find({
    collection: PEOPLE_COLLECTIONS.invitations,
    where: {
      and: [{ email: { equals: email } }, { role: { equals: 'owner' } }],
    },
    sort: '-createdAt',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const reusable = invitations.docs.some((invitation) => {
    if (invitation.status === 'accepted') return true
    return (
      (invitation.status === 'pending' || invitation.status === 'accepting') &&
      typeof invitation.expiresAt === 'number' &&
      invitation.expiresAt > Date.now()
    )
  })
  return reusable
}

async function createOwnerInvitation(
  payload: Awaited<ReturnType<typeof getPayload>>,
  body: ProvisionBody,
): Promise<void> {
  const token = createInvitationToken()
  await payload.create({
    collection: PEOPLE_COLLECTIONS.invitations,
    data: {
      tokenHash: await hashInvitationToken(token),
      email: body.owner.email,
      role: 'owner',
      status: 'pending',
      expiresAt: invitationExpiresAt(),
    },
    depth: 0,
    overrideAccess: true,
  })
}

async function ensureOwnerInvitation(
  payload: Awaited<ReturnType<typeof getPayload>>,
  body: ProvisionBody,
): Promise<boolean> {
  if (await hasExistingOwnerState(payload, body.owner.email)) return false
  await createOwnerInvitation(payload, body)
  return true
}

async function ensureIntakeForm(payload: Awaited<ReturnType<typeof getPayload>>, body: ProvisionBody): Promise<void> {
  const existing = await payload.find({
    collection: COLLECTIONS.intakeForms,
    where: { key: { equals: 'website' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs.length > 0) return
  await payload.create({
    collection: COLLECTIONS.intakeForms,
    data: {
      key: 'website',
      name: `${body.displayName} website form`,
      active: true,
      targetRecordType: 'lead',
      fieldMap: { name: 'title', email: 'email', phone: 'phone', company: 'companyName', message: 'notes' },
      allowedOrigins: [...body.intake.allowedOrigins],
      requireTurnstile: true,
      serverKeyHashes: [],
      successMessage: 'Thanks. We will be in touch.',
    },
    depth: 0,
    overrideAccess: true,
  })
}

async function seedSettings(payload: Awaited<ReturnType<typeof getPayload>>, body: ProvisionBody): Promise<void> {
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true })
  await payload.updateGlobal({
    slug: SETTINGS_GLOBAL,
    overrideAccess: true,
    data: {
      appName: body.displayName,
      timezone: body.timezone,
      locale: body.locale,
      currency: body.currency,
      appliedTemplates: mergeAppliedTemplates(settings.appliedTemplates, body.template),
    },
  })
}

/** Idempotently initializes tenant settings and the first owner account through the internal boundary. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  if (Number(request.headers.get('content-length')) > BODY_LIMIT)
    return Response.json({ error: 'body too large' }, { status: 413 })
  const body = provisionBody(await request.json().catch(() => undefined))
  if (body === undefined) return Response.json({ error: 'invalid provision request' }, { status: 400 })
  const payload = await getPayload({ config })
  const created = await ensureOwnerInvitation(payload, body)
  await seedSettings(payload, body)
  await ensureIntakeForm(payload, body)
  return Response.json({ status: created ? 'created' : 'existing' })
}

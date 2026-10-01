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
import { DEFAULT_LEAD_SOURCES, DEFAULT_LOST_REASONS } from '@ops/templates'
import { createLocalReq, getPayload } from 'payload'
import { applyTemplate } from '../../../../actions/onboarding/apply-template'
import type { Setting } from '../../../../../payload-types'
import { mergeAppliedTemplates, provisionBody, type ProvisionBody } from './helpers'
import { isBrandContentType } from '../../../../collaboration/brand'
import { invitationUrl } from '../../../../auth/invitation-url'

const BODY_LIMIT = 192_000
const BRAND_ASSET_LIMIT = 1_024 * 1_024

async function installBrandAssets(
  payload: Awaited<ReturnType<typeof getPayload>>,
  assets: ProvisionBody['brandAssets'],
): Promise<void> {
  if (assets === undefined) return
  const settings = (await payload.findGlobal({
    slug: SETTINGS_GLOBAL,
    depth: 0,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>
  const entries = [
    ['logo', assets.logoUrl, assets.logoBase64, assets.logoContentType, settings.logoFileKey, 'logoFileKey'],
    [
      'favicon',
      assets.faviconUrl,
      assets.faviconBase64,
      assets.faviconContentType,
      settings.faviconFileKey,
      'faviconFileKey',
    ],
  ] as const
  const { env } = await getCloudflareContext({ async: true })
  for (const [asset, source, base64, providedType, existingKey, field] of entries) {
    if (typeof existingKey === 'string' && existingKey.trim() !== '') continue
    const { bytes, contentType } = await readBrandAsset({ source, base64, providedType, asset })
    const extension = contentType.split('/')[1] === 'x-icon' ? 'ico' : contentType.split('/')[1]
    const key = `brand/${asset}.${extension}`
    if (bytes.byteLength === 0 || bytes.byteLength > BRAND_ASSET_LIMIT)
      throw new Error(`${asset} brand asset is too large`)
    await env.R2.put(key, bytes, { httpMetadata: { contentType } })
    await payload.updateGlobal({ slug: SETTINGS_GLOBAL, overrideAccess: true, data: { [field]: key } })
  }
}

// eslint-disable-next-line complexity -- one bounded decoder handles the two supported source forms.
async function readBrandAsset({
  source,
  base64,
  providedType,
  asset,
}: {
  readonly source: string | undefined
  readonly base64: string | undefined
  readonly providedType: string | undefined
  readonly asset: 'logo' | 'favicon'
}): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (base64 !== undefined) {
    const contentType = providedType?.split(';')[0]?.toLowerCase() ?? ''
    if (!isBrandContentType(contentType)) throw new Error(`unexpected ${asset} brand asset type`)
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer
    return { bytes, contentType }
  }
  if (source === undefined) throw new Error(`${asset} brand asset source is missing`)
  const response = await fetch(source)
  if (!response.ok) throw new Error(`unable to fetch ${asset} brand asset (${String(response.status)})`)
  const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase() ?? ''
  if (!isBrandContentType(contentType)) throw new Error(`unexpected ${asset} brand asset type`)
  return { bytes: await response.arrayBuffer(), contentType }
}

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

/** Makes a pending owner invitation for `email` and returns the link the owner opens; the secret in it is shown once. */
export async function createOwnerInvitation(
  payload: Awaited<ReturnType<typeof getPayload>>,
  email: string,
): Promise<string> {
  const token = createInvitationToken()
  await payload.create({
    collection: PEOPLE_COLLECTIONS.invitations,
    data: {
      tokenHash: await hashInvitationToken(token),
      email,
      role: 'owner',
      status: 'pending',
      expiresAt: invitationExpiresAt(),
    },
    depth: 0,
    overrideAccess: true,
  })
  return invitationUrl(token)
}

/** The new owner's invitation link, or undefined when the owner already has an account or a usable invitation. */
async function ensureOwnerInvitation(
  payload: Awaited<ReturnType<typeof getPayload>>,
  body: ProvisionBody,
): Promise<string | undefined> {
  if (await hasExistingOwnerState(payload, body.owner.email)) return undefined
  return createOwnerInvitation(payload, body.owner.email)
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

/** Gives a new workspace the usual lead sources and lost reasons, once; a workspace that already has some is left alone. */
async function ensureLookups(payload: Awaited<ReturnType<typeof getPayload>>): Promise<void> {
  const lists = [
    [COLLECTIONS.sources, DEFAULT_LEAD_SOURCES],
    [COLLECTIONS.lostReasons, DEFAULT_LOST_REASONS],
  ] as const
  for (const [collection, names] of lists) {
    const existing = await payload.count({ collection, overrideAccess: true })
    if (existing.totalDocs > 0) continue
    for (const name of names) await payload.create({ collection, data: { name }, depth: 0, overrideAccess: true })
  }
}

async function seedSettings(payload: Awaited<ReturnType<typeof getPayload>>, body: ProvisionBody): Promise<void> {
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true })
  await payload.updateGlobal({
    slug: SETTINGS_GLOBAL,
    overrideAccess: true,
    data: {
      appName: body.displayName,
      // provisionBody validates this against the same canonical list used by the settings select.
      timezone: body.timezone as Setting['timezone'],
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
  await installBrandAssets(payload, body.brandAssets)
  await seedSettings(payload, body)
  await ensureIntakeForm(payload, body)
  await ensureLookups(payload)
  // The tenant file names its business type, so the workspace starts with that type's pipelines, fields and wording.
  const applied = await applyTemplate({ payload, req: await createLocalReq({}, payload) }, body.template, {
    trusted: true,
  })
  if (!applied.ok) return Response.json({ error: applied.error.message }, { status: 400 })
  // Last, so a run that fails earlier never spends the owner's invitation link, which is shown only once.
  const inviteUrl = await ensureOwnerInvitation(payload, body)
  return Response.json(inviteUrl === undefined ? { status: 'existing' } : { status: 'created', inviteUrl })
}

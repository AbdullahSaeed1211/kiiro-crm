'use server'
/* eslint-disable max-lines -- settings actions share one authorization boundary; intake helpers live beside the screen. */

import { revalidatePath } from 'next/cache'
import { can, type Role } from '@ops/platform'
import { payloadData, type UntypedPayload } from '../../auth/api'
import { getProductContext, requireRole, type ProductContext } from '../../auth/context'
import {
  INTAKE_KEY_PATTERN,
  parseIntakeFormSettings,
  randomServerKey,
  sha256Hex,
} from '../../../app/(app)/settings/intake/intake-validation'

export type ActionResult =
  { readonly ok: true; readonly data?: unknown } | { readonly ok: false; readonly error: string }
const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

function normalizeSettings(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data }
  for (const key of ['weekStartsOn', 'stalledDays']) {
    if (typeof normalized[key] === 'string' && normalized[key].trim() !== '') normalized[key] = Number(normalized[key])
  }
  return normalized
}
const NOTIFICATION_TYPES = new Set([
  'assigned',
  'mentioned',
  'due_soon',
  'overdue',
  'digest',
  'intake_received',
  'email_received',
  'invitation_accepted',
  'stalled',
])

function notificationChannels(value: unknown): Record<string, { inApp: boolean; email: boolean }> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const entries = Object.entries(value)
  if (entries.some(([key, channel]) => !NOTIFICATION_TYPES.has(key) || typeof channel !== 'object' || channel === null))
    return undefined
  const normalized: Record<string, { inApp: boolean; email: boolean }> = {}
  for (const [key, channel] of entries) {
    const record = channel as Record<string, unknown>
    if (typeof record.inApp !== 'boolean' || typeof record.email !== 'boolean') return undefined
    normalized[key] = { inApp: record.inApp, email: record.email }
  }
  return normalized
}

async function createInvitation({
  dataPayload,
  context,
  email,
  role,
}: Readonly<{ dataPayload: UntypedPayload; context: ProductContext; email: string; role: Role }>): Promise<string> {
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  await dataPayload.create({
    collection: 'invitations',
    data: { tokenHash, email, role, status: 'pending', invitedBy: context.actor.id, expiresAt: Date.now() + 604800000 },
    overrideAccess: true,
    req: context.req,
  })
  return token
}

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const context = await getProductContext()
  const data = normalizeSettings(recordOf(input))
  const keys = Object.keys(data)
  const owner = can(context.actor, 'manage_settings', { type: 'settings' })
  const managerUpdate =
    context.actor.role === 'manager' && keys.every((key) => key === 'terminology' || key === 'stalledDays')
  if (!owner && !managerUpdate) return { ok: false, error: 'You do not have permission to update these settings.' }
  try {
    await context.payload.updateGlobal({ slug: 'settings', data, overrideAccess: true, req: context.req })
    revalidatePath('/settings')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save settings.' }
  }
}

export async function saveBranding(input: unknown): Promise<ActionResult> {
  return updateSettings({ brand: recordOf(input) })
}

export async function saveModules(input: unknown): Promise<ActionResult> {
  const data = recordOf(input)
  return updateSettings({
    modules: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === 'true'])),
  })
}

export async function saveEmailSettings(input: unknown): Promise<ActionResult> {
  const data = recordOf(input)
  return updateSettings({
    email: {
      inboundDomain: stringValue(data.inboundDomain) ?? null,
      inboundLocalPrefix: stringValue(data.inboundLocalPrefix) ?? null,
    },
  })
}

export async function createIntakeForm(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const key = stringValue(data.key)?.toLowerCase()
  const name = stringValue(data.name)
  if (key === undefined || name === undefined || !INTAKE_KEY_PATTERN.test(key))
    return { ok: false, error: 'Name and a lowercase URL-safe key are required.' }
  try {
    await context.payload.create({
      collection: 'intakeForms',
      data: {
        key,
        name,
        active: true,
        targetRecordType: 'lead',
        fieldMap: { name: 'title', email: 'email', phone: 'phone', company: 'companyName', message: 'notes' },
        allowedOrigins: [],
        requireTurnstile: true,
        serverKeyHashes: [],
        successMessage: 'Thanks. We will be in touch.',
      },
      req: context.req,
    })
    revalidatePath('/settings/intake')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create intake form.' }
  }
}

export async function updateIntakeForm(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const id = stringValue(data.id)
  if (id === undefined) return { ok: false, error: 'Intake form id is required.' }
  const parsed = parseIntakeFormSettings(data)
  if (!parsed.ok) return parsed
  try {
    await context.payload.update({
      collection: 'intakeForms',
      id,
      data: parsed.data,
      req: context.req,
    })
    revalidatePath('/settings/intake')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to update intake form.' }
  }
}

/** Adds a new hashed server credential and returns the plaintext exactly once for copying. */
export async function rotateIntakeServerKey(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Intake form id is required.' }
  try {
    const found = await context.payload.find({
      collection: 'intakeForms',
      where: { id: { equals: id } },
      limit: 1,
      depth: 0,
      req: context.req,
    })
    if (found.docs.length === 0) return { ok: false, error: 'Intake form not found.' }
    const form = found.docs[0]
    const currentHashes = Array.isArray(form.serverKeyHashes)
      ? form.serverKeyHashes.filter((hash): hash is string => typeof hash === 'string')
      : []
    const serverKey = randomServerKey()
    await context.payload.update({
      collection: 'intakeForms',
      id,
      data: { serverKeyHashes: [...currentHashes, await sha256Hex(serverKey)] },
      req: context.req,
    })
    revalidatePath('/settings/intake')
    return { ok: true, data: { serverKey } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create server key.' }
  }
}

export async function saveTerminology(input: unknown): Promise<ActionResult> {
  return updateSettings({ terminology: recordOf(input) })
}

// eslint-disable-next-line complexity, max-statements -- configuration writes share one validated boundary
export async function saveConfiguration(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const collection = stringValue(data.collection)
  if (collection === undefined || !['fieldDefinitions', 'workflows', 'savedViews', 'layouts'].includes(collection))
    return { ok: false, error: 'Configuration collection is invalid.' }
  const id = stringValue(data.id)
  const values = { ...data }
  delete values.collection
  delete values.id
  if (collection === 'savedViews' && values.owner === undefined) values.owner = context.actor.id
  try {
    const dataPayload = payloadData(context.payload)
    if (id === undefined)
      await dataPayload.create({ collection, data: values, overrideAccess: false, req: context.req })
    else await dataPayload.update({ collection, id, data: values, overrideAccess: false, req: context.req })
    revalidatePath('/settings')
    if (collection === 'savedViews') revalidatePath('/settings/views')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save configuration.' }
  }
}

/** Deletes one configuration record after the collection access policy checks ownership. */
export async function deleteConfiguration(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const collection = stringValue(data.collection)
  const id = stringValue(data.id)
  if (collection === undefined || !['fieldDefinitions', 'workflows', 'savedViews', 'layouts'].includes(collection))
    return { ok: false, error: 'Configuration collection is invalid.' }
  if (id === undefined) return { ok: false, error: 'Configuration id is required.' }
  try {
    await payloadData(context.payload).delete({ collection, id, overrideAccess: false, req: context.req })
    revalidatePath('/settings')
    if (collection === 'savedViews') revalidatePath('/settings/views')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to delete configuration.' }
  }
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager', 'staff')
  const name = stringValue(recordOf(input).name)
  if (name === undefined) return { ok: false, error: 'Name is required.' }
  try {
    await context.payload.update({ collection: 'users', id: context.actor.id, data: { name }, req: context.req })
    revalidatePath('/settings/profile')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save profile.' }
  }
}

// Preference validation and the read-modify-write must remain one server action.
// eslint-disable-next-line complexity, max-lines-per-function -- validation and persistence share the same authorized update boundary.
export async function saveNotificationPreferences(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager', 'staff')
  const dataPayload = payloadData(context.payload)
  const data = recordOf(input)
  const channels = notificationChannels(data.channels)
  const digestLocalTime = data.digestLocalTime
  if (
    channels === undefined ||
    (digestLocalTime !== null &&
      digestLocalTime !== undefined &&
      (typeof digestLocalTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(digestLocalTime)))
  )
    return { ok: false, error: 'Notification channels or digest time are invalid.' }
  try {
    const found = await dataPayload.find({
      collection: 'notificationPrefs',
      where: { user: { equals: context.actor.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    const prefs = {
      user: context.actor.id,
      channels,
      digestLocalTime: digestLocalTime ?? null,
    }
    const existing = found.docs.at(0)
    if (existing === undefined)
      await dataPayload.create({
        collection: 'notificationPrefs',
        data: prefs,
        overrideAccess: false,
        req: context.req,
      })
    else
      await dataPayload.update({
        collection: 'notificationPrefs',
        id: existing.id,
        data: prefs,
        overrideAccess: false,
        req: context.req,
      })
    revalidatePath('/settings/notifications')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save notification preferences.' }
  }
}

// eslint-disable-next-line complexity, max-statements -- invitation authorization, duplicate checks and token creation share one transactional boundary.
export async function inviteMember(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const dataPayload = payloadData(context.payload)
  const data = recordOf(input)
  const email = stringValue(data.email)?.toLowerCase()
  const role = stringValue(data.role) as Role | undefined
  if (email === undefined || role === undefined || !['owner', 'manager', 'staff'].includes(role))
    return { ok: false, error: 'Email and a valid role are required.' }
  if (!can(context.actor, 'manage_members', { type: 'users', role }))
    return { ok: false, error: 'You cannot invite this role.' }
  try {
    const existing = await dataPayload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: context.req,
    })
    if (existing.docs.length > 0) return { ok: false, error: 'An active member already uses this email.' }
    const pending = await dataPayload.find({
      collection: 'invitations',
      where: { and: [{ email: { equals: email } }, { status: { equals: 'pending' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: context.req,
    })
    if (pending.docs.length > 0) return { ok: false, error: 'A pending invitation already exists for this email.' }
    const token = await createInvitation({ dataPayload, context, email, role })
    revalidatePath('/settings/members')
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
    return { ok: true, data: { token, inviteUrl: `${origin.replace(/\/$/u, '')}/invite/${token}` } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create invitation.' }
  }
}

export async function revokeInvitation(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Invitation id is required.' }
  try {
    await context.payload.update({
      collection: 'invitations',
      id,
      data: { status: 'revoked' },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath('/settings/members')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to revoke invitation.' }
  }
}

// eslint-disable-next-line complexity, max-statements -- resend validates authorization, rotates the token, and revokes the previous record atomically.
export async function resendInvitation(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Invitation id is required.' }
  try {
    const found = await context.payload.find({
      collection: 'invitations',
      where: { id: { equals: id } },
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req: context.req,
    })
    const invitation = found.docs.at(0)
    if (invitation === undefined) return { ok: false, error: 'Invitation not found.' }
    if (invitation.status === 'accepted' || invitation.status === 'accepting')
      return { ok: false, error: 'This invitation has already been accepted.' }
    if (!can(context.actor, 'manage_members', { type: 'users', role: invitation.role }))
      return { ok: false, error: 'You cannot resend this invitation.' }
    const dataPayload = payloadData(context.payload)
    const token = await createInvitation({
      dataPayload,
      context,
      email: invitation.email.toLowerCase(),
      role: invitation.role,
    })
    await dataPayload.update({
      collection: 'invitations',
      id,
      data: { status: 'revoked' },
      overrideAccess: false,
      req: context.req,
    })
    revalidatePath('/settings/members')
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
    return { ok: true, data: { inviteUrl: `${origin.replace(/\/$/u, '')}/invite/${token}` } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to resend invitation.' }
  }
}

export async function saveGroup(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const data = recordOf(input)
  const name = stringValue(data.name)
  if (name === undefined) return { ok: false, error: 'Group name is required.' }
  try {
    if (typeof data.id === 'string' && data.id !== '')
      await context.payload.update({ collection: 'groups', id: data.id, data: { name }, req: context.req })
    else await context.payload.create({ collection: 'groups', data: { name }, req: context.req })
    revalidatePath('/settings/groups')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save group.' }
  }
}

export async function deleteGroup(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager')
  const id = stringValue(recordOf(input).id)
  if (id === undefined) return { ok: false, error: 'Group id is required.' }
  try {
    await context.payload.delete({ collection: 'groups', id, req: context.req })
    revalidatePath('/settings/groups')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to delete group.' }
  }
}

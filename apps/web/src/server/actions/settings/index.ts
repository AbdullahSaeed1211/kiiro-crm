'use server'

import { revalidatePath } from 'next/cache'
import { can, type Role } from '@ops/platform'
import { payloadData, type UntypedPayload } from '../../auth/api'
import { getProductContext, requireRole, type ProductContext } from '../../auth/context'

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

export async function saveTerminology(input: unknown): Promise<ActionResult> {
  return updateSettings({ terminology: recordOf(input) })
}

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
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save configuration.' }
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
// eslint-disable-next-line complexity, max-lines-per-function
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
    const token = await createInvitation({ dataPayload, context, email, role })
    revalidatePath('/settings/members')
    return { ok: true, data: { token } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create invitation.' }
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

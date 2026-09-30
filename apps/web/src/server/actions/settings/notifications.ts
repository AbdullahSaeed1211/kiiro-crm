'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionFailure, actionOk, type ActionResult } from '../../action-result'
import { payloadData } from '../../auth/api'
import { requireRole } from '../../auth/context'
import { recordOf } from './input'

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

const DIGEST_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** The digest time as `HH:MM`, null when unset, or undefined when it is not a valid time. */
function digestTime(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null
  return typeof value === 'string' && DIGEST_TIME.test(value) ? value : undefined
}

// Preference validation and the read-modify-write must remain one server action.
export async function saveNotificationPreferences(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager', 'staff')
  const data = recordOf(input)
  const channels = notificationChannels(data.channels)
  const digestLocalTime = digestTime(data.digestLocalTime)
  if (channels === undefined || digestLocalTime === undefined)
    return actionError('VALIDATION', 'Notification channels or digest time are invalid.')
  try {
    const dataPayload = payloadData(context.payload)
    const found = await dataPayload.find({
      collection: 'notificationPrefs',
      where: { user: { equals: context.actor.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req: context.req,
    })
    const write = {
      collection: 'notificationPrefs',
      data: { user: context.actor.id, channels, digestLocalTime },
      overrideAccess: false,
      req: context.req,
    }
    const existing = found.docs.at(0)
    // Only the system may create a preferences row, so a user's first save creates their own row with system access;
    // `user` is fixed to the signed-in user above, and every later save goes through the owner-only update rule.
    if (existing === undefined) await dataPayload.create({ ...write, overrideAccess: true })
    else await dataPayload.update({ ...write, id: existing.id })
    revalidatePath('/settings/notifications')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveNotificationPreferences', 'Unable to save notification preferences.')
  }
}

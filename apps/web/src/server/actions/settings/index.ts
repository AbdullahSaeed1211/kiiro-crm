'use server'

import { revalidatePath } from 'next/cache'
import { can } from '@ops/platform'
import { actionError, actionFailure, actionOk } from '../../action-result'
import { getProductContext, requireRole } from '../../auth/context'
import { recordOf, stringValue } from './input'
import { recordAuditEvent } from '../../audit/record'
import { restampDealCurrency } from '../../crm/restamp-deal-currency'
import { isSupportedCurrency } from '../../../i18n/currencies'
import type { ActionResult } from '../../action-result'
export type { ActionResult } from '../../action-result'

function normalizeSettings(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data }
  for (const key of ['weekStartsOn', 'stalledDays']) {
    if (typeof normalized[key] === 'string' && normalized[key].trim() !== '') normalized[key] = Number(normalized[key])
  }
  return normalized
}
/** A new workspace currency applies to the deals already saved, not only to new ones. */
async function followCurrency(payload: Parameters<typeof restampDealCurrency>[0], currency: unknown): Promise<void> {
  if (typeof currency === 'string') await restampDealCurrency(payload, currency)
}

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const context = await getProductContext()
  const data = normalizeSettings(recordOf(input))
  if (data.currency !== undefined && !isSupportedCurrency(data.currency))
    return actionError('VALIDATION', 'Choose a supported ISO 4217 currency.')
  const keys = Object.keys(data)
  const owner = can(context.actor, 'manage_settings', { type: 'settings' })
  const managerUpdate =
    context.actor.role === 'manager' && keys.every((key) => key === 'terminology' || key === 'stalledDays')
  if (!owner && !managerUpdate) return actionError('FORBIDDEN', 'You do not have permission to update these settings.')
  try {
    await context.payload.updateGlobal({ slug: 'settings', data, overrideAccess: true, req: context.req })
    await followCurrency(context.payload, data.currency)
    await recordAuditEvent(context, { verb: 'settings.changed', summary: keys.join(', '), data: { keys } })
    revalidatePath('/settings')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'updateSettings', 'Unable to save settings.')
  }
}

export async function saveBranding(input: unknown): Promise<ActionResult> {
  return updateSettings({ brand: recordOf(input) })
}

export async function saveModules(input: unknown): Promise<ActionResult> {
  const data = recordOf(input)
  const enabled = (value: unknown): boolean => value === true || value === 'true'
  return updateSettings({
    modules: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, enabled(value)])),
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

export async function saveTerminology(input: unknown): Promise<ActionResult> {
  return updateSettings({ terminology: recordOf(input) })
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner', 'manager', 'staff')
  const name = stringValue(recordOf(input).name)
  if (name === undefined) return actionError('VALIDATION', 'Name is required.')
  try {
    await context.payload.update({ collection: 'users', id: context.actor.id, data: { name }, req: context.req })
    revalidatePath('/settings/profile')
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveProfile', 'Unable to save profile.')
  }
}

'use server'

import type { Result } from '@ops/kernel'
import { assignDeals, createDeal, markLost, moveDeal, moveDeals, updateDeal } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { crmDeps } from '../../container'
import { getWorkspaceSettings } from '../../auth/context'
import { applyWorkspaceCurrency } from '../workspace-currency'
import { withDefaultOwner } from './view-model'
import { actionError, actionOk, toActionResult, type ActionResult } from '../../action-result'

export type DealActionResult = ActionResult<{ readonly id: string; readonly updatedAt: number }>

function refresh(id?: string) {
  revalidatePath('/deals')
  revalidatePath('/deals/board')
  if (id !== undefined) revalidatePath(`/deals/${id}`)
}

function resultOf(result: Result<{ readonly id: string; readonly updatedAt: number }>): DealActionResult {
  return result.ok
    ? actionOk({ id: result.value.id, updatedAt: result.value.updatedAt })
    : actionError(result.error.code, result.error.message)
}

export async function createDealAction(input: unknown): Promise<DealActionResult> {
  const [deps, settings] = await Promise.all([crmDeps(), getWorkspaceSettings()])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const normalized = applyWorkspaceCurrency(input, currency)
  const result = await createDeal(deps, withDefaultOwner(normalized, deps.actor.id))
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function updateDealAction(input: unknown): Promise<DealActionResult> {
  const result = await updateDeal(await crmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function moveDealAction(input: unknown): Promise<DealActionResult> {
  const result = await moveDeal(await crmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function markDealLostAction(input: unknown): Promise<DealActionResult> {
  const result = await markLost(await crmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

/** Sets one owner on the selected deals and reports how many changed. */
export async function assignDealsAction(input: unknown): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const result = await assignDeals(await crmDeps(), input)
  if (result.ok) refresh()
  return toActionResult(result)
}

/** Moves the selected deals to one open stage and reports how many changed. */
export async function moveDealsAction(input: unknown): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const result = await moveDeals(await crmDeps(), input)
  if (result.ok) refresh()
  return toActionResult(result)
}

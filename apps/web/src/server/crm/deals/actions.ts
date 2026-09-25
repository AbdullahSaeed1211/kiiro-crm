'use server'

import type { Result } from '@ops/kernel'
import { createDeal, markLost, moveDeal, updateDeal } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { getCrmDeps } from '../deps'
import { getWorkspaceSettings } from '../../auth/context'
import { applyWorkspaceCurrency } from '../workspace-currency'
import { withDefaultOwner } from './view-model'
import { actionError, actionOk, type ActionResult } from '../../action-result'

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
  const [deps, settings] = await Promise.all([getCrmDeps(), getWorkspaceSettings()])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const normalized = applyWorkspaceCurrency(input, currency)
  const result = await createDeal(deps, withDefaultOwner(normalized, deps.actor.id))
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function updateDealAction(input: unknown): Promise<DealActionResult> {
  const result = await updateDeal(await getCrmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function moveDealAction(input: unknown): Promise<DealActionResult> {
  const result = await moveDeal(await getCrmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

export async function markDealLostAction(input: unknown): Promise<DealActionResult> {
  const result = await markLost(await getCrmDeps(), input)
  if (result.ok) refresh(result.value.id)
  return resultOf(result)
}

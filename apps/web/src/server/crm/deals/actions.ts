'use server'

import { createDeal, markLost, moveDeal, updateDeal } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { getCrmDeps } from '../deps'
import { withDefaultOwner } from './view-model'

export type DealActionResult =
  | { readonly ok: true; readonly id: string; readonly updatedAt: number }
  | { readonly ok: false; readonly message: string; readonly code?: string }

function resultOf(
  result:
    | { readonly ok: true; readonly value: { readonly id: string; readonly updatedAt: number } }
    | { readonly ok: false; readonly error: { readonly message: string; readonly code: string } },
): DealActionResult {
  return result.ok
    ? { ok: true, id: result.value.id, updatedAt: result.value.updatedAt }
    : { ok: false, message: result.error.message, code: result.error.code }
}

function refresh(id?: string) {
  revalidatePath('/deals')
  revalidatePath('/deals/board')
  if (id !== undefined) revalidatePath(`/deals/${id}`)
}

export async function createDealAction(input: unknown): Promise<DealActionResult> {
  const deps = await getCrmDeps()
  const result = await createDeal(deps, withDefaultOwner(input, deps.actor.id))
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

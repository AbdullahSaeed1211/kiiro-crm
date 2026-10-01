import { asId, ok } from '@ops/kernel'
import { z } from 'zod'
import { failure, parse, type CrmResult } from '../domain/helpers'
import { leadMoveDestinationError } from '../domain/lead-moves'
import type { CrmDeps } from '../ports/repository'
import { moveDeal, moveLead, updateDeal, updateLead } from './pipeline'

const MAX_BULK = 100
const bulkIds = z.array(z.string().trim().min(1)).min(1).max(MAX_BULK)

const assignSchema = z.object({ ids: bulkIds, ownerId: z.string().trim().min(1).nullable() }).strict()

const moveSchema = z.object({ ids: bulkIds, toStageId: z.string().trim().min(1) }).strict()

type BulkResult = Readonly<{ updated: number; skipped: number }>

type Change = (id: string, expectedUpdatedAt: number) => Promise<{ ok: boolean }>

/** Applies `change` to each distinct record with its current version and counts the records that took it. */
async function eachRecord(
  input: { readonly deps: CrmDeps; readonly type: 'lead' | 'deal'; readonly ids: readonly string[] },
  change: Change,
): Promise<BulkResult> {
  const distinct = [...new Set(input.ids)]
  let updated = 0
  for (const id of distinct) {
    const current = await input.deps.repo.get(input.type, asId(id))
    if (current !== undefined && (await change(id, current.updatedAt)).ok) updated += 1
  }
  return { updated, skipped: distinct.length - updated }
}

/** Sets one owner on many leads. A lead the actor cannot edit, or that changed meanwhile, is skipped and counted. */
export async function assignLeads(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(assignSchema, input)
  if (!parsed.ok) return parsed
  const { ids, ownerId } = parsed.value
  return ok(
    await eachRecord({ deps, type: 'lead', ids }, (id, expectedUpdatedAt) =>
      updateLead(deps, { id, expectedUpdatedAt, patch: { ownerId } }),
    ),
  )
}

/** Sets one owner on many deals; a deal the actor cannot edit, or that changed meanwhile, is skipped and counted. */
export async function assignDeals(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(assignSchema, input)
  if (!parsed.ok) return parsed
  const { ids, ownerId } = parsed.value
  return ok(
    await eachRecord({ deps, type: 'deal', ids }, (id, expectedUpdatedAt) =>
      updateDeal(deps, { id, expectedUpdatedAt, patch: { ownerId } }),
    ),
  )
}

/** Moves many leads to one open stage. Won, lost and cancelled stages need the record page (conversion or a lost reason). */
export async function moveLeads(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(moveSchema, input)
  if (!parsed.ok) return parsed
  const { ids, toStageId } = parsed.value
  const workflow = await deps.repo.loadDefaultWorkflow('lead')
  if (!workflow.ok) return workflow
  const stage = workflow.value.stages.find((candidate) => candidate.id === asId(toStageId))
  if (stage === undefined) return failure('NOT_FOUND', 'stage not found')
  const blocked = leadMoveDestinationError(stage)
  if (blocked !== null) return failure('VALIDATION', blocked)
  return ok(
    await eachRecord({ deps, type: 'lead', ids }, (leadId, expectedUpdatedAt) =>
      moveLead(deps, { leadId, toStageId, expectedUpdatedAt }),
    ),
  )
}

/** Moves many deals to one open stage. Won and lost stages need the record page, where a lost reason is asked for. */
export async function moveDeals(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(moveSchema, input)
  if (!parsed.ok) return parsed
  const { ids, toStageId } = parsed.value
  const workflow = await deps.repo.loadDefaultWorkflow('deal')
  if (!workflow.ok) return workflow
  const stage = workflow.value.stages.find((candidate) => candidate.id === asId(toStageId))
  if (stage === undefined) return failure('NOT_FOUND', 'stage not found')
  if (stage.category.startsWith('done') || stage.category === 'cancelled')
    return failure('VALIDATION', 'Close a deal from its record page.')
  return ok(
    await eachRecord({ deps, type: 'deal', ids }, (dealId, expectedUpdatedAt) =>
      moveDeal(deps, { dealId, toStageId, expectedUpdatedAt }),
    ),
  )
}

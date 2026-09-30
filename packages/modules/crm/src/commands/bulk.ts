import { asId, ok } from '@ops/kernel'
import { z } from 'zod'
import { failure, parse, type CrmResult } from '../domain/helpers'
import { leadMoveDestinationError } from '../domain/lead-moves'
import type { CrmDeps } from '../ports/repository'
import { moveLead, updateLead } from './pipeline'

const MAX_BULK = 100
const bulkIds = z.array(z.string().trim().min(1)).min(1).max(MAX_BULK)

const assignLeadsSchema = z.object({ ids: bulkIds, ownerId: z.string().trim().min(1).nullable() }).strict()

const moveLeadsSchema = z.object({ ids: bulkIds, toStageId: z.string().trim().min(1) }).strict()

type BulkResult = Readonly<{ updated: number; skipped: number }>

/** Applies `change` to each distinct lead with its current version and counts the leads that took it. */
async function eachLead(
  deps: CrmDeps,
  ids: readonly string[],
  change: (leadId: string, expectedUpdatedAt: number) => Promise<{ ok: boolean }>,
): Promise<BulkResult> {
  const distinct = [...new Set(ids)]
  let updated = 0
  for (const leadId of distinct) {
    const current = await deps.repo.get('lead', asId(leadId))
    if (current !== undefined && (await change(leadId, current.updatedAt)).ok) updated += 1
  }
  return { updated, skipped: distinct.length - updated }
}

/** Sets one owner on many leads. A lead the actor cannot edit, or that changed meanwhile, is skipped and counted. */
export async function assignLeads(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(assignLeadsSchema, input)
  if (!parsed.ok) return parsed
  const { ids, ownerId } = parsed.value
  return ok(
    await eachLead(deps, ids, (id, expectedUpdatedAt) =>
      updateLead(deps, { id, expectedUpdatedAt, patch: { ownerId } }),
    ),
  )
}

/** Moves many leads to one open stage. Won, lost and cancelled stages need the record page (conversion or a lost reason). */
export async function moveLeads(deps: CrmDeps, input: unknown): Promise<CrmResult<BulkResult>> {
  const parsed = parse(moveLeadsSchema, input)
  if (!parsed.ok) return parsed
  const { ids, toStageId } = parsed.value
  const workflow = await deps.repo.loadDefaultWorkflow('lead')
  if (!workflow.ok) return workflow
  const stage = workflow.value.stages.find((candidate) => candidate.id === asId(toStageId))
  if (stage === undefined) return failure('NOT_FOUND', 'stage not found')
  const blocked = leadMoveDestinationError(stage)
  if (blocked !== null) return failure('VALIDATION', blocked)
  return ok(
    await eachLead(deps, ids, (leadId, expectedUpdatedAt) => moveLead(deps, { leadId, toStageId, expectedUpdatedAt })),
  )
}

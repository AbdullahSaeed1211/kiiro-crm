import { asId, ok } from '@ops/kernel'
import { z } from 'zod'
import { parse, type CrmResult } from '../domain/helpers'
import type { CrmDeps } from '../ports/repository'
import { updateLead } from './pipeline'

const MAX_BULK = 100

const assignLeadsSchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).min(1).max(MAX_BULK),
    ownerId: z.string().trim().min(1).nullable(),
  })
  .strict()

type AssignLeadsResult = Readonly<{ updated: number; skipped: number }>

/** Sets one owner on many leads. A lead the actor cannot edit, or that changed meanwhile, is skipped and counted. */
export async function assignLeads(deps: CrmDeps, input: unknown): Promise<CrmResult<AssignLeadsResult>> {
  const parsed = parse(assignLeadsSchema, input)
  if (!parsed.ok) return parsed
  let updated = 0
  for (const leadId of new Set(parsed.value.ids)) {
    const current = await deps.repo.get('lead', asId(leadId))
    if (current === undefined) continue
    const result = await updateLead(deps, {
      id: leadId,
      expectedUpdatedAt: current.updatedAt,
      patch: { ownerId: parsed.value.ownerId },
    })
    if (result.ok) updated += 1
  }
  return ok({ updated, skipped: new Set(parsed.value.ids).size - updated })
}

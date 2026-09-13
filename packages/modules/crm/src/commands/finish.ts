import type { CrmDeps } from '../ports/repository'
import type { DealRecord, LeadRecord } from '../ports/records'
import { createActivity, failure, type CrmResult } from '../domain/helpers'
import type { Workflow } from '@ops/platform'

export async function finishConversion(input: {
  readonly deps: CrmDeps
  readonly lead: LeadRecord
  readonly convertedStage: Workflow['stages'][number]
  readonly deal: DealRecord
}): Promise<CrmResult<LeadRecord>> {
  const { deps, lead, convertedStage, deal } = input
  const updated = await deps.repo.update(
    'lead',
    lead.id,
    {
      convertedAt: deps.clock.now(),
      convertedDealId: deal.id,
      stageId: convertedStage.id,
      stageEnteredAt: deps.clock.now(),
    },
    lead.updatedAt,
  )
  if (updated === undefined) return failure('CONFLICT', 'lead was updated during conversion')
  await createActivity({
    deps,
    record: { type: 'lead', id: lead.id },
    verb: 'record.converted',
    data: { dealId: deal.id },
  })
  await createActivity({
    deps,
    record: { type: 'deal', id: deal.id },
    verb: 'record.created',
    data: { fromLead: lead.id },
  })
  return { ok: true, value: updated }
}

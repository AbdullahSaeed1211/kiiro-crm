import { asId } from '@ops/kernel'
import type { DealRecord, LeadRecord } from '@ops/module-crm'
import type { RequestContext } from '@/server/container'

/** The parts of a lead and a deal the figures read, so only those are fetched. */
export type ReportLead = Pick<LeadRecord, 'createdAt' | 'ownerId'>
export type ReportDeal = Pick<DealRecord, 'createdAt' | 'closedAt' | 'ownerId' | 'stageId' | 'value'>

const dateOf = (value: unknown): number => (typeof value === 'string' ? Date.parse(value) : 0)
const idOrNull = (value: unknown): ReportLead['ownerId'] =>
  typeof value === 'string' && value !== '' ? asId(value) : null

/** Just the fields the figures use, so thousands of leads and deals are not read with all their other data. */
export async function loadLeanRows(context: RequestContext): Promise<{ leads: ReportLead[]; deals: ReportDeal[] }> {
  const request = { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
  const [leads, deals] = await Promise.all([
    context.payload.find({ collection: 'leads', select: { owner: true, createdAt: true }, ...request }),
    context.payload.find({
      collection: 'deals',
      select: {
        owner: true,
        stageId: true,
        closedAt: true,
        valueAmountMinor: true,
        valueCurrency: true,
        createdAt: true,
      },
      ...request,
    }),
  ])
  return {
    leads: leads.docs.map((lead) => ({ createdAt: dateOf(lead.createdAt), ownerId: idOrNull(lead.owner) })),
    deals: deals.docs.map((deal) => ({
      createdAt: dateOf(deal.createdAt),
      closedAt: typeof deal.closedAt === 'number' ? deal.closedAt : null,
      ownerId: idOrNull(deal.owner),
      stageId: asId(typeof deal.stageId === 'string' ? deal.stageId : ''),
      value:
        typeof deal.valueAmountMinor === 'number' && typeof deal.valueCurrency === 'string'
          ? { amountMinor: deal.valueAmountMinor, currency: deal.valueCurrency }
          : null,
    })),
  }
}

import { asId } from '@ops/kernel'
import type { DealRecord, LeadRecord } from '@ops/module-crm'
import type { Where } from 'payload'
import type { RequestContext } from '@/server/container'
import type { ReportRange } from './report-range'

/** The parts of a lead and a deal the figures read, so only those are fetched. */
export type ReportLead = Pick<LeadRecord, 'createdAt' | 'ownerId'>
export type ReportDeal = Pick<DealRecord, 'createdAt' | 'closedAt' | 'ownerId' | 'stageId' | 'value'>

const dateOf = (value: unknown): number => (typeof value === 'string' ? Date.parse(value) : 0)
const idOrNull = (value: unknown): ReportLead['ownerId'] =>
  typeof value === 'string' && value !== '' ? asId(value) : null

const iso = (time: number): string => new Date(time).toISOString()

/** Leads made in the range; the figures count nothing else. */
const leadsInRange = (range: ReportRange): Where => ({
  and: [{ createdAt: { greater_than_equal: iso(range.from) } }, { createdAt: { less_than: iso(range.to) } }],
})

/** Deals made or closed in the range; the figures count nothing else. */
const dealsInRange = (range: ReportRange): Where => ({
  or: [
    { and: [{ createdAt: { greater_than_equal: iso(range.from) } }, { createdAt: { less_than: iso(range.to) } }] },
    { and: [{ closedAt: { greater_than_equal: range.from } }, { closedAt: { less_than: range.to } }] },
  ],
})

/**
 * Just the leads and deals the figures count, with just the fields they use, so a workspace with many years of
 * history reads only the period asked for.
 */
export async function loadLeanRows(
  context: RequestContext,
  range: ReportRange,
): Promise<{ leads: ReportLead[]; deals: ReportDeal[] }> {
  const request = { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
  const [leads, deals] = await Promise.all([
    context.payload.find({
      collection: 'leads',
      where: leadsInRange(range),
      select: { owner: true, createdAt: true },
      ...request,
    }),
    context.payload.find({
      collection: 'deals',
      where: dealsInRange(range),
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

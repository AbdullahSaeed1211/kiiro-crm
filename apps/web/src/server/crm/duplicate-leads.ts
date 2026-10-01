import { listCrmPage } from '@ops/adapter-payload'
import type { LeadRecord } from '@ops/module-crm'
import type { Where } from 'payload'
import { getRequestContext } from '../container'

const SHOWN = 4

/** The few other leads that share this lead's email (in any letter case) or phone, and how many there are in all. */
export async function findDuplicateLeads(input: {
  readonly leadId: string
  readonly email: string | null
  readonly phone: string | null
}): Promise<{ readonly leads: readonly LeadRecord[]; readonly total: number }> {
  const same: Where[] = [
    ...(input.email === null ? [] : [{ email: { like: input.email } }]),
    ...(input.phone === null ? [] : [{ phone: { equals: input.phone } }]),
  ]
  if (same.length === 0) return { leads: [], total: 0 }
  const context = await getRequestContext()
  const found = await listCrmPage(context.req, {
    type: 'lead',
    where: { and: [{ id: { not_equals: input.leadId } }, { or: same }] },
    page: 1,
    limit: SHOWN,
  })
  return { leads: found.records, total: found.total }
}

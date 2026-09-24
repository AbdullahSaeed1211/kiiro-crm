import type { DealSeed, LeadSeed } from './crm-types'

/** No pipeline entries are seeded without owner-provided client or deal data. */
export const LEADS: readonly LeadSeed[] = []
export const DEALS: readonly DealSeed[] = []

import type { UserKey, WorkflowSeed } from './data'

export type Service = 'Website' | 'SEO' | 'Social media' | 'Design' | 'App development' | 'Ads'
export type Budget = 'Under $1k' | '$1k–5k' | '$5k–20k' | '$20k+'

export interface OrganizationSeed {
  readonly key: string
  readonly name: string
  readonly website: string
  readonly phone: string
  readonly email: string
  readonly source?: string
}

export interface ContactSeed {
  readonly key: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly organization: string
}

export interface LeadSeed {
  readonly key: string
  readonly title: string
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
  readonly companyName: string
  readonly organization: string
  readonly source: string
  readonly owner: UserKey
  readonly assignees: readonly UserKey[]
  readonly stage: string
  readonly service: Service
  readonly budget: Budget
  readonly lostReason?: string
  readonly lostNote?: string
}

export interface DealSeed {
  readonly key: string
  readonly title: string
  readonly organization: string
  readonly contacts: readonly string[]
  readonly primaryContact: string
  readonly valueAmountMinor: number
  readonly expectedCloseDay: number
  readonly stage: string
  readonly owner: UserKey
  readonly assignees: readonly UserKey[]
  readonly serviceLines: readonly Service[]
  readonly sourceLead?: string
  readonly lostReason?: string
  readonly lostNote?: string
}

export const CRM_WORKFLOWS: readonly WorkflowSeed[] = [
  {
    recordType: 'lead',
    name: 'Leads',
    stages: [
      { name: 'New', category: 'open', color: 'blue' },
      { name: 'Contacted', category: 'active', color: 'amber' },
      { name: 'Qualified', category: 'active', color: 'violet' },
      { name: 'Converted', category: 'done_success', color: 'green' },
      { name: 'Disqualified', category: 'done_failure', color: 'red' },
    ],
  },
  {
    recordType: 'deal',
    name: 'Deals',
    stages: [
      { name: 'Discovery', category: 'active', color: 'blue', probability: 10 },
      { name: 'Proposal sent', category: 'active', color: 'amber', probability: 40 },
      { name: 'Negotiation', category: 'waiting', color: 'violet', probability: 70 },
      { name: 'Won', category: 'done_success', color: 'green', probability: 100 },
      { name: 'Lost', category: 'done_failure', color: 'red', probability: 0 },
    ],
  },
]

export const SOURCES = ['Website form', 'Referral', 'Ads', 'Social', 'Email', 'Phone/walk-in'] as const
export const LOST_REASONS = ['Budget', 'Timing', 'No response', 'Chose competitor', 'Not a fit'] as const

export { CONTACTS, ORGANIZATIONS } from './crm-directory-data'
export { DEALS, LEADS } from './crm-pipeline-data'

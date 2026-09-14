import type { WorkflowSeed } from './data'

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

export type { Budget, ContactSeed, DealSeed, LeadSeed, OrganizationSeed, Service } from './crm-types'
export { CONTACTS, ORGANIZATIONS } from './crm-directory-data'
export { DEALS, LEADS } from './crm-pipeline-data'

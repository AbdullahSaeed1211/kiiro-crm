import { createCrmRepository } from '@ops/adapter-payload'
import type { CrmRepository, DealRecord, LeadRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import { getRequestContext } from '../work/deps'

const TERMINAL_CATEGORIES = new Set<Workflow['stages'][number]['category']>([
  'done_success',
  'done_failure',
  'cancelled',
])

export interface DashboardStats {
  readonly organizations: number
  readonly contacts: number
  readonly openLeads: number
  readonly openDeals: number
}

async function workflowOrUndefined(
  repository: CrmRepository,
  recordType: 'lead' | 'deal',
): Promise<Workflow | undefined> {
  try {
    return await repository.loadDefaultWorkflow(recordType)
  } catch {
    // A freshly provisioned workspace can render before its optional workflow seed is complete.
    return undefined
  }
}

function openRecord(record: LeadRecord | DealRecord, workflow: Workflow | undefined): boolean {
  if (workflow === undefined) return 'closedAt' in record ? record.closedAt === null : record.convertedAt === null
  const stage = workflow.stages.find((item) => item.id === record.stageId)
  return stage === undefined || !TERMINAL_CATEGORIES.has(stage.category)
}

/** Loads small, permission-scoped CRM totals used by the dashboard stat strip. */
export async function loadDashboardStats(): Promise<DashboardStats> {
  const context = await getRequestContext()
  const repository = createCrmRepository(context.req)
  const [organizations, contacts, leads, deals, leadWorkflow, dealWorkflow] = await Promise.all([
    repository.list('organization'),
    repository.list('contact'),
    repository.list('lead'),
    repository.list('deal'),
    workflowOrUndefined(repository, 'lead'),
    workflowOrUndefined(repository, 'deal'),
  ])
  return {
    organizations: organizations.length,
    contacts: contacts.length,
    openLeads: leads.filter((lead) => openRecord(lead, leadWorkflow)).length,
    openDeals: deals.filter((deal) => openRecord(deal, dealWorkflow)).length,
  }
}

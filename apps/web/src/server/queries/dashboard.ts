import { createCrmRepository } from '@ops/adapter-payload'
import type { CrmRepository } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import type { PayloadRequest, Where } from 'payload'
import { getRequestContext, type RequestContext } from '../work/deps'

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

function openWhere(recordType: 'lead' | 'deal', workflow: Workflow | undefined): Where {
  if (workflow === undefined) {
    const field = recordType === 'lead' ? 'convertedAt' : 'closedAt'
    return { or: [{ [field]: { equals: null } }, { [field]: { exists: false } }] }
  }
  const terminal = workflow.stages.filter((stage) => TERMINAL_CATEGORIES.has(stage.category)).map((stage) => stage.id)
  return terminal.length === 0 ? {} : { or: [{ stageId: { not_in: terminal } }, { stageId: { exists: false } }] }
}

async function countVisible({
  payload,
  req,
  collection,
  where = {},
}: Readonly<{
  payload: PayloadRequest['payload']
  req: PayloadRequest
  collection: 'organizations' | 'contacts' | 'leads' | 'deals'
  where?: Where
}>): Promise<number> {
  const result = await payload.count({ collection, where, overrideAccess: false, user: req.user, req })
  return result.totalDocs
}

/** Loads small, permission-scoped CRM totals used by the dashboard stat strip. */
export async function loadDashboardStats(context?: RequestContext): Promise<DashboardStats> {
  const requestContext = context ?? (await getRequestContext())
  const repository = createCrmRepository(requestContext.req)
  const [organizations, contacts, leadWorkflow, dealWorkflow] = await Promise.all([
    countVisible({ payload: requestContext.payload, req: requestContext.req, collection: 'organizations' }),
    countVisible({ payload: requestContext.payload, req: requestContext.req, collection: 'contacts' }),
    workflowOrUndefined(repository, 'lead'),
    workflowOrUndefined(repository, 'deal'),
  ])
  const [openLeads, openDeals] = await Promise.all([
    countVisible({
      payload: requestContext.payload,
      req: requestContext.req,
      collection: 'leads',
      where: openWhere('lead', leadWorkflow),
    }),
    countVisible({
      payload: requestContext.payload,
      req: requestContext.req,
      collection: 'deals',
      where: openWhere('deal', dealWorkflow),
    }),
  ])
  return {
    organizations,
    contacts,
    openLeads,
    openDeals,
  }
}

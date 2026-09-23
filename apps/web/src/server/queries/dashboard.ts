import type { PayloadRequest, Where } from 'payload'
import { getRequestContext, type RequestContext } from '../work/deps'

const TERMINAL_CATEGORIES: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])
const PIPELINE_TYPES = ['lead', 'deal'] as const

function field(document: object, key: string): unknown {
  return (document as Readonly<Record<string, unknown>>)[key]
}

export interface DashboardStats {
  readonly organizations: number
  readonly contacts: number
  readonly openLeads: number
  readonly openDeals: number
}

function terminalStageIds(documents: readonly object[], recordType: (typeof PIPELINE_TYPES)[number]) {
  const workflow = documents.find((document) => field(document, 'recordType') === recordType)
  const stages = workflow === undefined ? undefined : field(workflow, 'stages')
  if (!Array.isArray(stages)) return undefined
  return stages.flatMap((stage: unknown) => {
    if (typeof stage !== 'object' || stage === null) return []
    const id = field(stage, 'id')
    const category = field(stage, 'category')
    return (typeof id === 'string' || typeof id === 'number') &&
      typeof category === 'string' &&
      TERMINAL_CATEGORIES.has(category)
      ? [id]
      : []
  })
}

function openWhere(
  recordType: (typeof PIPELINE_TYPES)[number],
  terminalStages: readonly (string | number)[] | undefined,
): Where {
  if (terminalStages === undefined) {
    const field = recordType === 'lead' ? 'convertedAt' : 'closedAt'
    return { or: [{ [field]: { equals: null } }, { [field]: { exists: false } }] }
  }
  return terminalStages.length === 0
    ? {}
    : { or: [{ stageId: { not_in: terminalStages } }, { stageId: { exists: false } }] }
}

async function loadPipelineWorkflows(context: RequestContext): Promise<readonly object[]> {
  try {
    const page = await context.payload.find({
      collection: 'workflows',
      where: { recordType: { in: [...PIPELINE_TYPES] } },
      sort: 'createdAt',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: false,
      req: context.req,
    })
    return page.docs
  } catch {
    // Keep the previous missing/inaccessible-workflow fallback for freshly provisioned workspaces.
    return []
  }
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
  const [organizations, contacts, workflows] = await Promise.all([
    countVisible({ payload: requestContext.payload, req: requestContext.req, collection: 'organizations' }),
    countVisible({ payload: requestContext.payload, req: requestContext.req, collection: 'contacts' }),
    loadPipelineWorkflows(requestContext),
  ])
  const [openLeads, openDeals] = await Promise.all([
    countVisible({
      payload: requestContext.payload,
      req: requestContext.req,
      collection: 'leads',
      where: openWhere('lead', terminalStageIds(workflows, 'lead')),
    }),
    countVisible({
      payload: requestContext.payload,
      req: requestContext.req,
      collection: 'deals',
      where: openWhere('deal', terminalStageIds(workflows, 'deal')),
    }),
  ])
  return {
    organizations,
    contacts,
    openLeads,
    openDeals,
  }
}

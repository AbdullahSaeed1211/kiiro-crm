import { asId, systemClock } from '@ops/kernel'
import { createCrmRepository, createUnitOfWork, listCrmPage } from '@ops/adapter-payload'
import type { ContactRecord, CrmDeps, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { can, type Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadActivity, type ActivityItem } from './activity'
import { listEmailMessages, listRecordAttachments, listRelatedTasks } from '../directory/helpers'
import type { EmailThreadMessage, RecordAttachment, RelatedTask } from '../directory/types'
import { displayName, organizationName, stageForDeal, type DealListItem } from './view-model'
import type { Where } from 'payload'

export interface DealListData {
  readonly items: readonly DealListItem[]
  readonly organizations: readonly OrganizationRecord[]
  readonly contacts: readonly ContactRecord[]
  readonly workflow: Workflow
  readonly total: number
  readonly lostReasons: readonly { readonly id: string; readonly name: string }[]
}
export interface DealDetailData {
  readonly deal: DealRecord
  readonly workflow: Workflow
  readonly stage: Workflow['stages'][number]
  readonly organization: OrganizationRecord | null
  readonly contacts: readonly ContactRecord[]
  readonly organizations: readonly OrganizationRecord[]
  readonly allContacts: readonly ContactRecord[]
  readonly lostReasons: readonly { readonly id: string; readonly name: string }[]
  readonly activity: readonly ActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
  readonly relatedTasks: readonly RelatedTask[]
  readonly attachments: readonly RecordAttachment[]
}

export type { ActivityItem } from './activity'

function dealDeps(context: RequestContext): CrmDeps {
  return {
    actor: context.actor,
    can,
    repo: createCrmRepository(context.req),
    uow: createUnitOfWork(context.req),
    clock: systemClock,
  }
}

async function loadOwnerNames(context: Pick<RequestContext, 'payload' | 'req'>, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const { docs } = await context.payload.find({
    collection: 'users',
    where: { id: { in: ids } },
    limit: ids.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return new Map(docs.map((owner) => [owner.id, owner.name]))
}

// eslint-disable-next-line complexity -- stage and text filters must be combined before the paginated read.
function dealWhere(
  input: Readonly<{ query?: string; stageId?: string }>,
  organizations: readonly OrganizationRecord[],
): Where {
  const query = input.query?.trim() ?? ''
  const filters: Where[] = []
  if (input.stageId !== undefined && input.stageId !== '') filters.push({ stageId: { equals: input.stageId } })
  if (query !== '') {
    const organizationIds = organizations
      .filter((organization) => organization.name.toLowerCase().includes(query.toLowerCase()))
      .map((organization) => organization.id)
    const search: Where[] = [{ title: { contains: query } }]
    if (organizationIds.length > 0) search.push({ organization: { in: organizationIds } })
    filters.push({ or: search })
  }
  if (filters.length === 0) return {}
  if (filters.length === 1) return filters[0] ?? {}
  return { and: filters }
}

export async function getDealListData(
  input: Readonly<{ query?: string; stageId?: string; page?: number }> = {},
): Promise<DealListData> {
  const context = await getRequestContext()
  const deps = dealDeps(context)
  const dealsPromise = deps.repo.loadDefaultWorkflow('deal')
  const [organizations, contacts, workflow, lostReasons] = await Promise.all([
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    dealsPromise,
    deps.repo.listLookups('lostReason'),
  ])
  const dealsPage = await listCrmPage(context.req, {
    type: 'deal',
    where: dealWhere(input, organizations),
    page: Math.max(1, input.page ?? 1),
    limit: 50,
  })
  const ownerIds = dealsPage.records.flatMap((deal) => (deal.ownerId === null ? [] : [deal.ownerId]))
  const ownerNames = await loadOwnerNames(context, ownerIds)
  const items = dealsPage.records.map((deal) => ({
    deal,
    stage: stageForDeal(deal, workflow),
    organizationName: organizationName(deal, organizations),
    primaryContactName: displayName(contacts.find((contact) => contact.id === deal.primaryContactId)),
    ownerName: deal.ownerId === null ? null : (ownerNames.get(deal.ownerId) ?? null),
  }))
  return { items, organizations, contacts, workflow, total: dealsPage.total, lostReasons }
}

async function loadDealDetailParts({
  context,
  deps,
  deal,
  id,
}: Readonly<{ context: RequestContext; deps: CrmDeps; deal: DealRecord; id: string }>) {
  return Promise.all([
    deps.repo.loadWorkflow(deal.workflowId),
    deal.organizationId === null ? Promise.resolve(undefined) : deps.repo.get('organization', deal.organizationId),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.listLookups('lostReason'),
    loadActivity(context, id, true),
    listEmailMessages(context, { recordType: 'deal', recordId: id, parentAuthorized: true }),
    listRelatedTasks(context, 'deal', id),
    listRecordAttachments(context, 'deal', id),
  ])
}

export async function getDealDetailData(id: string): Promise<DealDetailData | null> {
  const context = await getRequestContext()
  const deps = dealDeps(context)
  const deal = await deps.repo.get('deal', asId(id))
  if (deal === undefined) return null
  const [
    workflow,
    organization,
    organizations,
    allContacts,
    lostReasons,
    activity,
    emailMessages,
    relatedTasks,
    attachments,
  ] = await loadDealDetailParts({ context, deps, deal, id })
  if (workflow === undefined) return null
  return {
    deal,
    workflow,
    stage: stageForDeal(deal, workflow),
    organization: organization ?? null,
    contacts: allContacts.filter((contact) => deal.contactIds.includes(contact.id)),
    organizations,
    allContacts,
    lostReasons,
    activity,
    emailMessages,
    relatedTasks,
    attachments,
  }
}

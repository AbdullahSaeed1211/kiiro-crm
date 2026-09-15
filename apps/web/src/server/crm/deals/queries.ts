import { asId, systemClock } from '@ops/kernel'
import { createCrmRepository, createUnitOfWork } from '@ops/adapter-payload'
import type { ContactRecord, CrmDeps, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { can, type Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '../../work/deps'
import { loadActivity, type ActivityItem } from './activity'
import { listEmailMessages } from '../directory/helpers'
import type { EmailThreadMessage } from '../directory/types'
import { displayName, organizationName, stageForDeal, type DealListItem } from './view-model'

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

export async function getDealListData(): Promise<DealListData> {
  const context = await getRequestContext()
  const deps = dealDeps(context)
  const [deals, organizations, contacts, workflow, lostReasons] = await Promise.all([
    deps.repo.list('deal'),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.loadDefaultWorkflow('deal'),
    deps.repo.listLookups('lostReason'),
  ])
  const ownerIds = deals.flatMap((deal) => (deal.ownerId === null ? [] : [deal.ownerId]))
  const ownerNames = await loadOwnerNames(context, ownerIds)
  const items = deals.map((deal) => ({
    deal,
    stage: stageForDeal(deal, workflow),
    organizationName: organizationName(deal, organizations),
    primaryContactName: displayName(contacts.find((contact) => contact.id === deal.primaryContactId)),
    ownerName: deal.ownerId === null ? null : (ownerNames.get(deal.ownerId) ?? null),
  }))
  return { items, organizations, contacts, workflow, total: deals.length, lostReasons }
}

export async function getDealDetailData(id: string): Promise<DealDetailData | null> {
  const context = await getRequestContext()
  const deps = dealDeps(context)
  const deal = await deps.repo.get('deal', asId(id))
  if (deal === undefined) return null
  const [workflow, organization, organizations, allContacts, lostReasons, activity, emailMessages] = await Promise.all([
    deps.repo.loadWorkflow(deal.workflowId),
    deal.organizationId === null ? Promise.resolve(undefined) : deps.repo.get('organization', deal.organizationId),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.listLookups('lostReason'),
    loadActivity(context, id, true),
    listEmailMessages(context, { recordType: 'deal', recordId: id, parentAuthorized: true }),
  ])
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
  }
}

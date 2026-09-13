import { asId } from '@ops/kernel'
import type { ContactRecord, DealRecord, OrganizationRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import { getRequestContext } from '../../work/deps'
import { getCrmDeps } from '../deps'
import { displayName, organizationName, stageForDeal, type DealListItem } from './view-model'

export interface DealListData {
  readonly items: readonly DealListItem[]
  readonly organizations: readonly OrganizationRecord[]
  readonly contacts: readonly ContactRecord[]
  readonly workflow: Workflow
  readonly total: number
}
export interface ActivityItem {
  readonly id: string
  readonly verb: string
  readonly occurredAt: number
  readonly actorName: string | null
  readonly data: Record<string, unknown>
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
}

async function loadActivity(
  payload: Awaited<ReturnType<typeof getRequestContext>>['payload'],
  id: string,
): Promise<readonly ActivityItem[]> {
  const page = await payload.find({
    collection: 'activity',
    where: { and: [{ recordType: { equals: 'deal' } }, { recordId: { equals: id } }] },
    sort: '-occurredAt',
    limit: 30,
    pagination: false,
    depth: 0,
    overrideAccess: false,
  })
  return page.docs.map((item) => ({
    id: item.id,
    verb: typeof item.verb === 'string' ? item.verb : 'activity.updated',
    occurredAt: typeof item.occurredAt === 'number' ? item.occurredAt : new Date(String(item.occurredAt)).getTime(),
    actorName: null,
    data: typeof item.data === 'object' && item.data !== null ? (item.data as Record<string, unknown>) : {},
  }))
}

export async function getDealListData(): Promise<DealListData> {
  const deps = await getCrmDeps()
  const [deals, organizations, contacts, workflow] = await Promise.all([
    deps.repo.list('deal'),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.loadDefaultWorkflow('deal'),
  ])
  const items = deals.map((deal) => ({
    deal,
    stage: stageForDeal(deal, workflow),
    organizationName: organizationName(deal, organizations),
    primaryContactName: displayName(contacts.find((contact) => contact.id === deal.primaryContactId)),
  }))
  return { items, organizations, contacts, workflow, total: deals.length }
}

export async function getDealDetailData(id: string): Promise<DealDetailData | null> {
  const { payload } = await getRequestContext()
  const deps = await getCrmDeps()
  const deal = await deps.repo.get('deal', asId(id))
  if (deal === undefined) return null
  const [workflow, organization, organizations, allContacts, lostReasons, activity] = await Promise.all([
    deps.repo.loadWorkflow(deal.workflowId),
    deal.organizationId === null ? Promise.resolve(undefined) : deps.repo.get('organization', deal.organizationId),
    deps.repo.list('organization'),
    deps.repo.list('contact'),
    deps.repo.listLookups('lostReason'),
    loadActivity(payload, id),
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
  }
}

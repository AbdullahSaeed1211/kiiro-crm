import { workflowOrThrow } from '../../workflow-result'
import { asId, systemClock } from '@ops/kernel'
import { createCrmRepository, createUnitOfWork, listCrmPage } from '@ops/adapter-payload'
import type { ContactRecord, CrmDeps, DealRecord, OrganizationRecord } from '@ops/module-crm'
import { can, type Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadPeople } from '../../people'
import { loadActivity, type ActivityItem } from './activity'
import { listEmailMessages, listRecordAttachments, listRelatedTasks } from '../directory/helpers'
import type { EmailThreadMessage, RecordAttachment, RelatedTask } from '../directory/types'
import { displayName, organizationName, stageForDeal, type DealListItem } from './view-model'
import type { Where } from 'payload'

export interface DealListData {
  readonly items: readonly DealListItem[]
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

function dealDeps(context: RequestContext): CrmDeps {
  return {
    actor: context.actor,
    can,
    repo: createCrmRepository(context.req),
    uow: createUnitOfWork(context.req),
    clock: systemClock,
  }
}

// eslint-disable-next-line complexity -- stage and text filters must be combined before the paginated read.
function dealWhere(input: Readonly<{ query?: string; stageId?: string }>, organizationIds: readonly string[]): Where {
  const query = input.query?.trim() ?? ''
  const filters: Where[] = []
  if (input.stageId !== undefined && input.stageId !== '') filters.push({ stageId: { equals: input.stageId } })
  if (query !== '') {
    const search: Where[] = [{ title: { contains: query } }]
    if (organizationIds.length > 0) search.push({ organization: { in: organizationIds } })
    filters.push({ or: search })
  }
  if (filters.length === 0) return {}
  if (filters.length === 1) return filters[0] ?? {}
  return { and: filters }
}

const NAME_MATCH_LIMIT = 100

/** Ids of the organizations whose name contains the text, so a deal search can also match by client. */
async function organizationIdsNamed(context: RequestContext, text: string): Promise<string[]> {
  if (text === '') return []
  const page = await listCrmPage(context.req, {
    type: 'organization',
    where: { name: { contains: text } },
    page: 1,
    limit: NAME_MATCH_LIMIT,
  })
  return page.records.map((organization) => organization.id)
}

/** The organizations and contacts the listed deals point at, by id; the rest of the book is never read. */
async function dealParties(context: RequestContext, deals: readonly DealRecord[]) {
  const organizationIds = [
    ...new Set(deals.flatMap((deal) => (deal.organizationId === null ? [] : [deal.organizationId]))),
  ]
  const contactIds = [
    ...new Set(deals.flatMap((deal) => (deal.primaryContactId === null ? [] : [deal.primaryContactId]))),
  ]
  const [organizations, contacts] = await Promise.all([
    organizationIds.length === 0
      ? { records: [] as OrganizationRecord[] }
      : listCrmPage(context.req, {
          type: 'organization',
          where: { id: { in: organizationIds } },
          page: 1,
          limit: organizationIds.length,
        }),
    contactIds.length === 0
      ? { records: [] as ContactRecord[] }
      : listCrmPage(context.req, {
          type: 'contact',
          where: { id: { in: contactIds } },
          page: 1,
          limit: contactIds.length,
        }),
  ])
  return { organizations: organizations.records, contacts: contacts.records }
}

export async function getDealListData(
  input: Readonly<{ query?: string; stageId?: string; page?: number; pageSize?: number }> = {},
): Promise<DealListData> {
  const context = await getRequestContext()
  const deps = dealDeps(context)
  const [workflow, lostReasons, organizationIds] = await Promise.all([
    deps.repo.loadDefaultWorkflow('deal').then(workflowOrThrow),
    deps.repo.listLookups('lostReason'),
    organizationIdsNamed(context, input.query?.trim() ?? ''),
  ])
  const dealsPage = await listCrmPage(context.req, {
    type: 'deal',
    where: dealWhere(input, organizationIds),
    page: Math.max(1, input.page ?? 1),
    limit: input.pageSize ?? 50,
  })
  const ownerIds = dealsPage.records.flatMap((deal) => (deal.ownerId === null ? [] : [deal.ownerId]))
  const [owners, parties] = await Promise.all([loadPeople(context, ownerIds), dealParties(context, dealsPage.records)])
  const items = dealsPage.records.map((deal) => ({
    deal,
    stage: stageForDeal(deal, workflow),
    organizationName: organizationName(deal, parties.organizations),
    primaryContactName: displayName(parties.contacts.find((contact) => contact.id === deal.primaryContactId)),
    ownerName: deal.ownerId === null ? null : (owners.get(deal.ownerId)?.name ?? null),
  }))
  return { items, workflow, total: dealsPage.total, lostReasons }
}

/** Every organization and contact as a name to pick from, read when the new-deal form opens. */
export async function getDealFormOptions(): Promise<{
  organizations: { id: string; name: string }[]
  contacts: { id: string; name: string }[]
}> {
  const deps = dealDeps(await getRequestContext())
  const [organizations, contacts] = await Promise.all([deps.repo.list('organization'), deps.repo.list('contact')])
  return {
    organizations: organizations.map(({ id, name }) => ({ id, name })),
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
    })),
  }
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

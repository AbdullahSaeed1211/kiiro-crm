import { workflowOrThrow } from '../../workflow-result'
import { createCrmRepository, listCrmPage } from '@ops/adapter-payload'
import type { LeadRecord, LookupRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadPeople } from '../../people'
import { listEmailMessages, listRecordAttachments, listRelatedTasks } from '../directory/helpers'
import { asId } from '@ops/kernel'

import { activityItem } from './lead-activity'
import { lookupMap, makeListItem, personMap, responseCheck, toStages } from './list-items'
import { type LeadListItem, type LeadPageData, type LeadPerson } from './types'

import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { Where } from 'payload'

const PAGE_SIZE = 50
type SearchParam = string | string[] | undefined

function pageValue(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export type LeadListResult = Readonly<{
  readonly items: readonly LeadListItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly stages: readonly KanbanStage[]
  readonly sources: readonly LookupRecord[]
  readonly lostReasons: readonly LookupRecord[]
  readonly people: readonly LeadPerson[]
  /** Active users the actor can assign a lead to. */
  readonly owners: readonly LeadPerson[]
}>

type LeadFacets = Readonly<{ source?: string; owner?: string }>

/** Source and owner narrow the list; `owner` is a user id, or `none` for leads nobody owns. */
function facetFilters({ source, owner }: LeadFacets): Where[] {
  const filters: Where[] = []
  if (source) filters.push({ source: { equals: source } })
  if (owner === 'none') filters.push({ owner: { exists: false } })
  else if (owner) filters.push({ owner: { equals: owner } })
  return filters
}

function leadWhere(
  params: Readonly<{ q?: string; stages?: readonly string[] }> & LeadFacets,
  workflow: Workflow,
): Where {
  const filters: Where[] = []
  const stages = params.stages ?? []
  if (stages.length > 0) filters.push({ stageId: { in: stages } })
  else {
    filters.push({
      stageId: {
        not_in: workflow.stages
          .filter((stage) => ['done_success', 'done_failure', 'cancelled'].includes(stage.category))
          .map((stage) => stage.id),
      },
    })
  }
  filters.push(...facetFilters(params))
  const query = params.q?.trim() ?? ''
  if (query !== '') {
    filters.push({
      or: ['title', 'firstName', 'lastName', 'email', 'companyName', 'phone'].map((field) => ({
        [field]: { contains: query },
      })),
    })
  }
  return filters.length === 1 ? (filters[0] ?? {}) : { and: filters }
}

async function loadLeadPeople(context: RequestContext, leads: readonly LeadRecord[]) {
  return loadPeople(
    context,
    leads.flatMap((lead) => [lead.ownerId, ...lead.assigneeIds].filter((id) => id !== null)),
  )
}

async function loadOwnerOptions(context: Awaited<ReturnType<typeof getRequestContext>>): Promise<LeadPerson[]> {
  const users = await context.payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    depth: 0,
    limit: 100,
    overrideAccess: false,
    req: context.req,
  })
  return [...personMap(users.docs).values()]
}

/** Reads visible leads and supporting lookup data for the table/board. */
export async function listLeads(
  params: Readonly<{ q?: string; stages?: readonly string[]; page?: number; pageSize?: number }> & LeadFacets,
): Promise<LeadListResult> {
  const context = await getRequestContext()
  const owner = params.owner === 'me' ? String(context.actor.id) : params.owner
  const repo = createCrmRepository(context.req)
  const workflowPromise = repo.loadDefaultWorkflow('lead').then(workflowOrThrow)
  const sourcesPromise = repo.listLookups('source')
  const lostReasonsPromise = repo.listLookups('lostReason')
  const workflow = await workflowPromise
  const [pageResult, sources, lostReasons] = await Promise.all([
    listCrmPage(context.req, {
      type: 'lead',
      where: leadWhere({ ...params, ...(owner === undefined ? {} : { owner }) }, workflow),
      page: Math.max(1, params.page ?? 1),
      limit: params.pageSize ?? PAGE_SIZE,
    }),
    sourcesPromise,
    lostReasonsPromise,
  ])
  const pageNumber = Math.max(1, params.page ?? 1)
  const stages = toStages(workflow)
  const sourceMap = lookupMap(sources)
  const people = await loadLeadPeople(context, pageResult.records)
  const overdue = await responseCheck(workflow)
  const items = pageResult.records.map((lead) => makeListItem({ lead, stages, sources: sourceMap, people, overdue }))
  return {
    items,
    total: pageResult.total,
    page: pageNumber,
    pageSize: params.pageSize ?? PAGE_SIZE,
    stages,
    sources,
    lostReasons,
    people: [...people.values()],
    owners: await loadOwnerOptions(context),
  }
}

/** Reads one authorized lead and its supporting details/activity. */
// eslint-disable-next-line max-lines-per-function -- lead detail loads the complete authorized record context in one boundary.
export async function getLeadPage(id: string): Promise<LeadPageData | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const lead = await repo.get('lead', asId(id))
  if (lead === undefined) return null
  const [workflow, sources, lostReasons, activityPage, emailMessages, relatedTasks, attachments] = await Promise.all([
    repo.loadWorkflow(lead.workflowId),
    repo.listLookups('source'),
    repo.listLookups('lostReason'),
    context.payload.find({
      collection: 'activity',
      where: { and: [{ recordType: { equals: 'lead' } }, { recordId: { equals: id } }] },
      sort: '-occurredAt',
      depth: 0,
      limit: 30,
      overrideAccess: true,
      req: context.req,
    }),
    listEmailMessages(context, { recordType: 'lead', recordId: id, parentAuthorized: true }),
    listRelatedTasks(context, 'lead', id),
    listRecordAttachments(context, 'lead', id),
  ])
  const stages = workflow === undefined ? [] : toStages(workflow)
  const users = await context.payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    depth: 0,
    limit: 0,
    overrideAccess: false,
    req: context.req,
  })
  const people = personMap(users.docs)
  const item = makeListItem({
    lead,
    stages,
    sources: lookupMap(sources),
    people,
    overdue: await responseCheck(workflow),
  })
  return {
    item,
    stages,
    sources,
    lostReasons,
    people: [...people.values()],
    activities: activityPage.docs.map((row) => activityItem(row, people)),
    emailMessages,
    relatedTasks,
    attachments,
  }
}

export function parseLeadSearch(value: SearchParam): string {
  return pageValue(value) ?? ''
}

export function parseLeadStages(value: SearchParam): string[] {
  let parts: string[]
  if (value === undefined) parts = []
  else if (Array.isArray(value)) parts = value
  else parts = [value]
  return parts.flatMap((part) => part.split(',')).filter(Boolean)
}

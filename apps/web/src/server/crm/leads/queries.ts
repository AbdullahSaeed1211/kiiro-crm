import { cache } from 'react'
import { leadTabData, type LeadTab } from './lead-tab-data'
import { workflowOrThrow } from '../../workflow-result'
import { createCrmRepository, listCrmPage, type CrmPageResult } from '@ops/adapter-payload'
import type { LeadRecord, LookupRecord } from '@ops/module-crm'
import { isManagerUp, type Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadPeople } from '../../people'
import { asId } from '@ops/kernel'

import { activityItem } from './lead-activity'
import { lookupMap, makeListItem, personMap, responseCheck, toStages } from './list-items'
import { type LeadListItem, type LeadPageData, type LeadPerson } from './types'

import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { Where } from 'payload'
import { todayAsDueAt } from '@ops/module-work'
import { getWorkspaceSettings } from '../../auth/context'
import { attentionLeadWhere } from '../../queries/today-leads'
import { authorizedTodayLeadPerson } from '../../queries/today-lead-scope'

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

type LeadFacets = Readonly<{ source?: string; owner?: string; person?: string }>

/** Source and owner narrow the list; `owner` is a user id, or `none` for leads nobody owns. */
function facetFilters({ source, owner, person }: LeadFacets): Where[] {
  const filters: Where[] = []
  if (source) filters.push({ source: { equals: source } })
  if (owner === 'none') filters.push({ owner: { exists: false } })
  else if (owner) filters.push({ owner: { equals: owner } })
  if (person === 'unassigned') filters.push({ and: [{ owner: { exists: false } }, { assignees: { exists: false } }] })
  else if (person) filters.push({ or: [{ owner: { equals: person } }, { assignees: { contains: person } }] })
  return filters
}

function queryFilter(query: string | undefined): Where[] {
  const value = query?.trim() ?? ''
  return value === ''
    ? []
    : [
        {
          or: ['title', 'firstName', 'lastName', 'email', 'companyName', 'phone'].map((field) => ({
            [field]: { contains: value },
          })),
        },
      ]
}

async function attentionFilter(context: RequestContext, enabled: boolean): Promise<Where | undefined> {
  if (!enabled) return undefined
  const settings = await getWorkspaceSettings()
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  return attentionLeadWhere(context, todayAsDueAt(Date.now(), timeZone))
}

function pageQuery(
  input: Readonly<{
    context: RequestContext
    params: Readonly<{ q?: string; stages?: readonly string[]; page?: number; pageSize?: number }> & LeadFacets
    owner: string | undefined
    workflow: Workflow
    attentionWhere: Where | undefined
  }>,
) {
  const { context, params, owner, workflow, attentionWhere } = input
  return listCrmPage(context.req, {
    type: 'lead',
    where: leadWhere({ ...params, ...(owner === undefined ? {} : { owner }) }, workflow, attentionWhere),
    page: Math.max(1, params.page ?? 1),
    limit: params.pageSize ?? PAGE_SIZE,
  })
}

async function resultFromPage(
  input: Readonly<{
    context: RequestContext
    pageResult: CrmPageResult<'lead'>
    sources: readonly LookupRecord[]
    lostReasons: readonly LookupRecord[]
    workflow: Workflow
    params: Readonly<{ page?: number; pageSize?: number }>
  }>,
): Promise<LeadListResult> {
  const { context, pageResult, sources, lostReasons, workflow, params } = input
  const stages = toStages(workflow)
  const sourceMap = lookupMap(sources)
  const people = await loadLeadPeople(context, pageResult.records)
  const overdue = await responseCheck(workflow)
  const items = pageResult.records.map((lead) => makeListItem({ lead, stages, sources: sourceMap, people, overdue }))
  return {
    items,
    total: pageResult.total,
    page: Math.max(1, params.page ?? 1),
    pageSize: params.pageSize ?? PAGE_SIZE,
    stages,
    sources,
    lostReasons,
    people: [...people.values()],
    owners: await loadOwnerOptions(context),
  }
}

function leadWhere(
  params: Readonly<{ q?: string; stages?: readonly string[] }> & LeadFacets,
  workflow: Workflow,
  attentionWhere?: Where,
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
  filters.push(...(attentionWhere === undefined ? [] : [attentionWhere]))
  filters.push(...queryFilter(params.q))
  return filters.length === 1 ? (filters[0] ?? {}) : { and: filters }
}

async function loadLeadPeople(context: RequestContext, leads: readonly LeadRecord[]) {
  return loadPeople(
    context,
    leads.flatMap((lead) => [lead.ownerId, ...lead.assigneeIds].filter((id) => id !== null)),
  )
}

/** The people a lead can be assigned to; only owners and managers assign, and staff may not read who is active. */
export async function loadOwnerOptions(context: Awaited<ReturnType<typeof getRequestContext>>): Promise<LeadPerson[]> {
  if (!isManagerUp(context.actor)) return []
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
  params: Readonly<{ q?: string; stages?: readonly string[]; page?: number; pageSize?: number; attention?: boolean }> &
    LeadFacets,
): Promise<LeadListResult> {
  const context = await getRequestContext()
  const owner = params.owner === 'me' ? String(context.actor.id) : params.owner
  const person = params.attention ? authorizedTodayLeadPerson(context.actor, params.person) : params.person
  const repo = createCrmRepository(context.req)
  const workflowPromise = repo.loadDefaultWorkflow('lead').then(workflowOrThrow)
  const sourcesPromise = repo.listLookups('source')
  const lostReasonsPromise = repo.listLookups('lostReason')
  const workflow = await workflowPromise
  const attentionWhere = await attentionFilter(context, params.attention === true)
  const [pageResult, sources, lostReasons] = await Promise.all([
    pageQuery({
      context,
      params: { ...params, ...(person === undefined ? {} : { person }) },
      owner,
      workflow,
      attentionWhere,
    }),
    sourcesPromise,
    lostReasonsPromise,
  ])
  return resultFromPage({ context, pageResult, sources, lostReasons, workflow, params })
}

/** One lead, read once per request: the page's title and its body both ask for it. */
export const getLeadRecord = cache(async (id: string) => {
  const context = await getRequestContext()
  return createCrmRepository(context.req).get('lead', asId(id))
})

/** Reads one authorized lead, what its header and side panel need, and the open tab's own data. */
export async function getLeadPage(id: string, tab: LeadTab = 'notes'): Promise<LeadPageData | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const lead = await getLeadRecord(id)
  if (lead === undefined) return null
  const [workflow, sources, lostReasons, users, tabData] = await Promise.all([
    repo.loadWorkflow(lead.workflowId),
    repo.listLookups('source'),
    repo.listLookups('lostReason'),
    context.payload.find({
      collection: 'users',
      where: { active: { equals: true } },
      depth: 0,
      limit: 0,
      overrideAccess: false,
      req: context.req,
    }),
    leadTabData(context, id, tab),
  ])
  const stages = workflow === undefined ? [] : toStages(workflow)
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
    activities: tabData.activityRows.map((row) => activityItem(row, people)),
    emailMessages: tabData.emailMessages,
    relatedTasks: tabData.relatedTasks,
    attachments: tabData.attachments,
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

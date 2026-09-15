import { createCrmRepository } from '@ops/adapter-payload'
import type { LeadRecord, LookupRecord } from '@ops/module-crm'
import { getRequestContext } from '../../work/deps'
import { listEmailMessages } from '../directory/helpers'
import { asId } from '@ops/kernel'
import type { Activity, User } from '../../../payload-types'
import {
  initials,
  stageFor,
  type LeadActivityItem,
  type LeadListItem,
  type LeadPageData,
  type LeadPerson,
} from './types'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'

const PAGE_SIZE = 50
type SearchParam = string | string[] | undefined

function pageValue(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toStages(workflow: {
  readonly stages: readonly {
    id: string
    name: string
    category: KanbanStage['category']
    color: KanbanStage['color']
  }[]
}): KanbanStage[] {
  return workflow.stages.map(({ id, name, category, color }) => ({ id, name, category, color }))
}

function lookupMap(rows: readonly LookupRecord[]): Map<string, LookupRecord> {
  return new Map(rows.map((row) => [row.id, row]))
}

function personMap(users: readonly User[]): Map<string, LeadPerson> {
  return new Map(users.map((user) => [user.id, { id: user.id, name: user.name, email: user.email }]))
}

function ownerOf(lead: LeadRecord, people: ReadonlyMap<string, LeadPerson>): LeadPerson | null {
  return lead.ownerId === null ? null : (people.get(lead.ownerId) ?? null)
}

function makeListItem(
  input: Readonly<{
    lead: LeadRecord
    stages: readonly KanbanStage[]
    sources: ReadonlyMap<string, LookupRecord>
    people: ReadonlyMap<string, LeadPerson>
  }>,
): LeadListItem {
  const { lead, stages, sources, people } = input
  return {
    lead,
    stage: stageFor(stages, lead.stageId),
    source: lead.sourceId === null ? null : (sources.get(lead.sourceId) ?? null),
    owner: ownerOf(lead, people),
  }
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
}>

function filterLeads(
  records: readonly LeadRecord[],
  params: Readonly<{ q?: string; stages?: readonly string[] }>,
  stageCategories: ReadonlyMap<string, KanbanStage['category']>,
): LeadRecord[] {
  const q = params.q?.trim().toLowerCase() ?? ''
  const stageIds = new Set(params.stages ?? [])
  return records.filter((lead) => {
    if (stageIds.size > 0 && !stageIds.has(lead.stageId)) return false
    if (
      stageIds.size === 0 &&
      ['done_success', 'done_failure', 'cancelled'].includes(stageCategories.get(lead.stageId) ?? '')
    )
      return false
    if (q === '') return true
    return [lead.title, lead.firstName, lead.lastName, lead.email, lead.companyName, lead.phone]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(q))
  })
}

async function loadLeadPeople(
  context: Awaited<ReturnType<typeof getRequestContext>>,
  leads: readonly LeadRecord[],
): Promise<Map<string, LeadPerson>> {
  const ids = [
    ...new Set(leads.flatMap((lead) => [lead.ownerId, ...lead.assigneeIds].filter((id) => id !== null))),
  ] as string[]
  if (ids.length === 0) return new Map()
  const users = await context.payload.find({
    collection: 'users',
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    overrideAccess: false,
    req: context.req,
  })
  return personMap(users.docs)
}

/** Reads visible leads and supporting lookup data for the table/board. */
export async function listLeads(
  params: Readonly<{ q?: string; stages?: readonly string[]; page?: number }>,
): Promise<LeadListResult> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const [records, workflow, sources, lostReasons] = await Promise.all([
    repo.list('lead'),
    repo.loadDefaultWorkflow('lead'),
    repo.listLookups('source'),
    repo.listLookups('lostReason'),
  ])
  const stages = toStages(workflow)
  const stageCategories = new Map(stages.map((stage) => [stage.id, stage.category]))
  const filtered = filterLeads(records, params, stageCategories)
  const sourceMap = lookupMap(sources)
  const people = await loadLeadPeople(context, filtered)
  const items = filtered.map((lead) => makeListItem({ lead, stages, sources: sourceMap, people }))
  const page = Math.max(1, params.page ?? 1)
  return {
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: items.length,
    page,
    pageSize: PAGE_SIZE,
    stages,
    sources,
    lostReasons,
    people: [...people.values()],
  }
}

function activityActor(row: Activity, people: ReadonlyMap<string, LeadPerson>): LeadPerson | null {
  if (typeof row.actor !== 'string') return null
  return people.get(row.actor) ?? null
}

function activityData(value: Activity['data']): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value
}

function activityItem(row: Activity, people: ReadonlyMap<string, LeadPerson>): LeadActivityItem {
  const actor = activityActor(row, people)
  const data = activityData(row.data)
  const actorName = actor?.name ?? null
  const actorInitials = actor === null ? null : initials(actor.name)
  return { id: row.id, occurredAt: row.occurredAt, actorName, actorInitials, verb: row.verb, data }
}

/** Reads one authorized lead and its supporting details/activity. */
// eslint-disable-next-line max-lines-per-function -- lead detail loads the complete authorized record context in one boundary.
export async function getLeadPage(id: string): Promise<LeadPageData | null> {
  const context = await getRequestContext()
  const repo = createCrmRepository(context.req)
  const lead = await repo.get('lead', asId(id))
  if (lead === undefined) return null
  const [workflow, sources, lostReasons, activityPage, emailMessages] = await Promise.all([
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
  const item = makeListItem({ lead, stages, sources: lookupMap(sources), people })
  return {
    item,
    stages,
    sources,
    lostReasons,
    people: [...people.values()],
    activities: activityPage.docs.map((row) => activityItem(row, people)),
    emailMessages,
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

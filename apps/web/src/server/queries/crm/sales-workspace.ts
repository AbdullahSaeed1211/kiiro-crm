import { listRecentCallLogs, listScheduleItems, type ScheduleItemRecord } from '@ops/module-crm'
import { isManagerUp } from '@ops/platform'
import { crmDeps, getRequestContext } from '@/server/container'
import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale } from '../../../i18n/config'
import type { Where } from 'payload'

const DAY = 86_400_000
const LEAD_LIMIT = 30
const TASK_LIMIT = 40

function refId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return typeof value === 'object' && value !== null ? refId(Reflect.get(value, 'id')) : undefined
}

function refs(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => refId(item) ?? []) : []
}

async function finishedTaskStages(context: Awaited<ReturnType<typeof getRequestContext>>): Promise<string[]> {
  const workflows = await context.payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    limit: 1,
    page: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return workflows.docs.flatMap((workflow) => {
    const stages: unknown = Reflect.get(workflow, 'stages')
    return Array.isArray(stages) ? stages.flatMap(finishedStageId) : []
  })
}

function finishedStageId(stage: unknown): string[] {
  if (typeof stage !== 'object' || stage === null) return []
  const id: unknown = Reflect.get(stage, 'id')
  const category: unknown = Reflect.get(stage, 'category')
  return typeof id === 'string' && ['done_success', 'done_failure', 'cancelled'].includes(String(category)) ? [id] : []
}

function mapSalesTask(task: unknown) {
  const id: unknown = Reflect.get(task as object, 'id')
  const title: unknown = Reflect.get(task as object, 'title')
  const dueAt: unknown = Reflect.get(task as object, 'dueAt')
  return {
    id: typeof id === 'string' ? id : String(id),
    title: typeof title === 'string' ? title : '',
    dueAt: typeof dueAt === 'number' ? dueAt : null,
  }
}

async function loadSalesTasks(context: Awaited<ReturnType<typeof getRequestContext>>) {
  const [finished, settings] = await Promise.all([finishedTaskStages(context), getWorkspaceSettings()])
  const result = await context.payload.find({
    collection: 'tasks',
    where: {
      and: [
        { assignees: { contains: String(context.actor.id) } },
        ...(finished.length === 0 ? [] : [{ stageId: { not_in: finished } }]),
      ],
    },
    sort: ['dueAt', 'id'],
    limit: TASK_LIMIT,
    page: 1,
    depth: 0,
    select: { id: true, title: true, dueAt: true },
    overrideAccess: false,
    req: context.req,
  })
  const timeZone: unknown = Reflect.get(settings, 'timezone')
  return {
    tasks: result.docs.map(mapSalesTask),
    locale: normalizeLocale(Reflect.get(settings, 'locale')),
    timeZone: typeof timeZone === 'string' ? timeZone : 'UTC',
  }
}

function mapLead(doc: unknown) {
  const record = doc as object
  const id = refId(Reflect.get(record, 'id'))
  const title: unknown = Reflect.get(record, 'title')
  const nextActionAt: unknown = Reflect.get(record, 'nextActionAt')
  const updatedAt: unknown = Reflect.get(record, 'updatedAt')
  return {
    id: id ?? '',
    title: typeof title === 'string' ? title : '',
    ownerId: refId(Reflect.get(record, 'owner')) ?? null,
    assigneeIds: refs(Reflect.get(record, 'assignees')),
    nextActionAt: typeof nextActionAt === 'number' ? nextActionAt : null,
    updatedAt: typeof updatedAt === 'string' ? Date.parse(updatedAt) : 0,
  }
}

async function loadSalesLeads(context: Awaited<ReturnType<typeof getRequestContext>>, team: boolean, actorId: string) {
  const where: Where = team
    ? {}
    : { and: [{ or: [{ owner: { equals: actorId } }, { assignees: { contains: actorId } }] }] }
  const result = await context.payload.find({
    collection: 'leads',
    where,
    sort: ['-updatedAt', 'id'],
    limit: LEAD_LIMIT + 1,
    page: 1,
    depth: 0,
    select: { id: true, title: true, owner: true, assignees: true, nextActionAt: true, updatedAt: true },
    overrideAccess: false,
    req: context.req,
  })
  const leads = result.docs.map(mapLead).filter((lead) => lead.id !== '')
  return { leads: leads.slice(0, LEAD_LIMIT), moreLeads: leads.length > LEAD_LIMIT }
}

function scheduleRows(items: readonly ScheduleItemRecord[], leads: ReturnType<typeof mapLead>[]) {
  const leadTitles = new Map(leads.map((lead) => [lead.id, lead.title]))
  const scheduledCallbacks = new Set<string>(
    items.filter((item) => item.kind === 'callback' && item.recordType === 'lead').map((item) => item.recordId),
  )
  const legacyCallbacks = leads.flatMap((lead) => {
    if (lead.nextActionAt === null || scheduledCallbacks.has(lead.id)) return []
    return [
      {
        id: `legacy-${lead.id}`,
        kind: 'callback' as const,
        recordType: 'lead' as const,
        recordId: lead.id,
        title: lead.title,
        startsAt: lead.nextActionAt,
        status: 'scheduled' as const,
        updatedAt: lead.updatedAt,
      },
    ]
  })
  return [
    ...items.map((item) => ({
      ...item,
      title: item.title ?? (item.recordType === 'lead' ? (leadTitles.get(item.recordId) ?? 'Lead') : 'Contact'),
    })),
    ...legacyCallbacks,
  ].sort((left, right) => left.startsAt - right.startsAt)
}

type CallRow = Extract<Awaited<ReturnType<typeof listRecentCallLogs>>, { ok: true }>['value'][number]

async function loadLeadCallDocs(context: Awaited<ReturnType<typeof getRequestContext>>, ids: readonly string[]) {
  if (ids.length === 0) return [] as readonly object[]
  const result = await context.payload.find({
    collection: 'leads',
    where: { id: { in: [...ids] } },
    limit: ids.length,
    page: 1,
    depth: 0,
    select: { id: true, title: true },
    overrideAccess: false,
    req: context.req,
  })
  return result.docs
}

async function loadContactCallDocs(context: Awaited<ReturnType<typeof getRequestContext>>, ids: readonly string[]) {
  if (ids.length === 0) return [] as readonly object[]
  const result = await context.payload.find({
    collection: 'contacts',
    where: { id: { in: [...ids] } },
    limit: ids.length,
    page: 1,
    depth: 0,
    select: { id: true, firstName: true, lastName: true },
    overrideAccess: false,
    req: context.req,
  })
  return result.docs
}

function titleMap(leadDocs: readonly object[], contactDocs: readonly object[]): Map<string, string> {
  const leadTitles = leadDocs.map(
    (doc) => [String(Reflect.get(doc, 'id')), String(Reflect.get(doc, 'title') ?? 'Lead')] as const,
  )
  const contactTitles = contactDocs.map(
    (doc) =>
      [
        String(Reflect.get(doc, 'id')),
        [Reflect.get(doc, 'firstName'), Reflect.get(doc, 'lastName')].filter(Boolean).join(' ') || 'Contact',
      ] as const,
  )
  return new Map([...leadTitles, ...contactTitles])
}

async function callTitles(context: Awaited<ReturnType<typeof getRequestContext>>, callRows: readonly CallRow[]) {
  const leadIds = [...new Set(callRows.filter((call) => call.recordType === 'lead').map((call) => call.recordId))]
  const contactIds = [...new Set(callRows.filter((call) => call.recordType === 'contact').map((call) => call.recordId))]
  const [leadDocs, contactDocs] = await Promise.all([
    loadLeadCallDocs(context, leadIds),
    loadContactCallDocs(context, contactIds),
  ])
  const titles = titleMap(leadDocs, contactDocs)
  return callRows.flatMap((call) => {
    const title = titles.get(call.recordId)
    return title === undefined ? [] : [{ ...call, title }]
  })
}

/** One scoped snapshot for the personal sales desk: owned leads, own calls, schedule and tasks. */
export async function loadSalesWorkspace(input: { readonly team?: boolean } = {}) {
  const context = await getRequestContext()
  const deps = await crmDeps(context)
  const manager = isManagerUp(context.actor)
  const team = manager && input.team === true
  const actorId = String(context.actor.id)
  const now = Date.now()
  const [leadResult, callsResult, scheduleResult, taskResult] = await Promise.all([
    loadSalesLeads(context, team, actorId),
    listRecentCallLogs(deps),
    listScheduleItems(deps, { from: now - 60 * DAY, to: now + 30 * DAY, scope: team ? 'team' : 'mine' }),
    loadSalesTasks(context),
  ])
  const callRows = callsResult.ok ? callsResult.value : []
  const schedule = scheduleRows(scheduleResult.ok ? scheduleResult.value : [], leadResult.leads)
  const calls = await callTitles(context, callRows)
  return {
    actorId,
    manager,
    team,
    now,
    locale: taskResult.locale,
    timeZone: taskResult.timeZone,
    leads: leadResult.leads,
    moreLeads: leadResult.moreLeads,
    schedule,
    calls,
    tasks: taskResult.tasks.slice(0, 12),
  }
}

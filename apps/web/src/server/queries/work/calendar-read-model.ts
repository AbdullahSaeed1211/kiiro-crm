import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale, type Locale } from '../../../i18n/config'
import type { StageCategory } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import type { Where } from 'payload'
import { listScheduleItems, type ScheduleItemRecord } from '@ops/module-crm'
import { crmDeps } from '@/server/container'
import { isManagerUp } from '@ops/platform'
import { formatYearMonth } from '@ops/ui/lib/dates'

/** The most open tasks the calendar loads for one month. */
/** A whole number of 90-row chunks, the most one D1 statement can bind, so the page is read in a few round trips. */
const CALENDAR_LIMIT = 540
const FINISHED: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])

interface CalendarTask {
  readonly id: string
  readonly title: string
  readonly stageCategory: StageCategory
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  readonly dueAt: number | null
  readonly startAt: number | null
  readonly updatedAt: number
}

interface CalendarReadModel {
  readonly actorId: string
  readonly manager: boolean
  readonly tasks: readonly CalendarTask[]
  readonly scheduleItems: readonly Readonly<{
    id: string
    kind: 'appointment' | 'callback'
    recordType: 'lead' | 'contact'
    recordId: string
    title: string | null
    parentTitle: string | null
    startsAt: number
    status: 'scheduled' | 'completed' | 'cancelled'
    assigneeIds: readonly string[]
    updatedAt: number
    assignableIds: readonly string[]
  }>[]
  readonly timeZone: string
  readonly weekStartsOn: 0 | 1
  readonly locale: Locale
  readonly calendarYear: number
  readonly calendarMonth: number
  /** True when the month has more open tasks than the calendar loads, so some are not shown. */
  readonly capped: boolean
}

const field = (document: object, name: string): unknown => Reflect.get(document, name)
const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null
const text = (document: object, name: string): string => {
  const result = field(document, name)
  return typeof result === 'string' ? result : ''
}
const validYear = (value: number): boolean => Number.isInteger(value) && value >= 1970 && value <= 2100
const validMonth = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 11

function selectedMonth(yearInput: unknown, monthInput: unknown, timeZone: string) {
  const localDate = formatYearMonth(Date.now(), timeZone)
  const currentYear = Number(localDate.year)
  const currentMonth = Number(localDate.month) - 1
  const requestedYear = typeof yearInput === 'string' ? Number(yearInput) : Number.NaN
  const requestedMonth = typeof monthInput === 'string' ? Number(monthInput) - 1 : Number.NaN
  const year = validYear(requestedYear) ? requestedYear : currentYear
  const month = validMonth(requestedMonth) ? requestedMonth : currentMonth
  return { year, month }
}

function stageCategories(workflows: readonly object[]): Map<string, StageCategory> {
  const categories = new Map<string, StageCategory>()
  for (const workflow of workflows) {
    const stages = field(workflow, 'stages')
    if (!Array.isArray(stages)) continue
    stages.forEach((stage: unknown) => {
      addStageCategory(categories, stage)
    })
  }
  return categories
}

function addStageCategory(categories: Map<string, StageCategory>, stage: unknown): void {
  if (!isRecord(stage)) return
  const stageId = field(stage, 'id')
  const category = field(stage, 'category')
  if ((typeof stageId === 'string' || typeof stageId === 'number') && typeof category === 'string') {
    categories.set(String(stageId), category as StageCategory)
  }
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function mapTasks(documents: readonly object[], categories: ReadonlyMap<string, StageCategory>): CalendarTask[] {
  const priorities = ['none', 'low', 'medium', 'high', 'urgent'] as const
  return documents.map((document) => {
    const id = field(document, 'id')
    const dueAt = field(document, 'dueAt')
    const startAt = field(document, 'startAt')
    const updatedAt = Date.parse(text(document, 'updatedAt'))
    const stageId = field(document, 'stageId')
    const priority = field(document, 'priority')
    return {
      id: typeof id === 'string' || typeof id === 'number' ? String(id) : '',
      title: text(document, 'title'),
      stageCategory: categories.get(String(stageId)) ?? 'open',
      priority: priorities.find((item) => item === priority) ?? 'none',
      dueAt: finiteOrNull(dueAt),
      startAt: finiteOrNull(startAt),
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    }
  })
}

/** The month's due-date window, plus each person whose tasks are required; several people narrow it further. */
function monthClauses(year: number, month: number, assigneeIds: readonly string[]): Where[] {
  // Extra UTC days cover all timezone offsets; the calendar filters returned events by local date.
  const from = Date.UTC(year, month, 1) - 86_400_000
  const to = Date.UTC(year, month + 1, 1) + 86_400_000
  const clauses: Where[] = [{ dueAt: { greater_than_equal: from } }, { dueAt: { less_than: to } }]
  for (const assigneeId of assigneeIds) clauses.push({ assignees: { in: [assigneeId] } })
  return clauses
}

/** "My tasks" and a chosen person both narrow the month, as they do on the board and the timeline. */
function requiredPeople(input: Readonly<{ mine?: boolean; assignee?: string }>, actorId: string): string[] {
  return [
    ...(input.mine === true ? [actorId] : []),
    ...(input.assignee === undefined || input.assignee === '' ? [] : [input.assignee]),
  ]
}

/** Reads only tasks in the selected calendar month, plus workflow labels and calendar settings. */
type CalendarInput = Readonly<{ year: unknown; month: unknown; mine?: boolean; assignee?: string }>

function scheduleScope(input: CalendarInput, context: RequestContext) {
  const mine = input.mine === true || !isManagerUp(context.actor)
  if (mine) return { scope: 'mine' as const }
  return {
    scope: 'team' as const,
    ...(input.assignee === undefined || input.assignee === '' ? {} : { assigneeId: input.assignee }),
  }
}

async function parentDetails(deps: Awaited<ReturnType<typeof crmDeps>>, item: ScheduleItemRecord) {
  const parent = await deps.repo.get(item.recordType, item.recordId)
  if (parent === undefined) return { assignableIds: [] as string[], title: null }
  const owner = parent.ownerId
  const assignees = 'assigneeIds' in parent ? parent.assigneeIds : []
  const title = 'title' in parent ? parent.title : [parent.firstName, parent.lastName].filter(Boolean).join(' ')
  return {
    assignableIds: [
      ...new Set([...(owner === null ? [] : [String(owner)]), ...assignees.map(String), String(deps.actor.id)]),
    ],
    title: title.trim() === '' ? null : title,
  }
}

async function calendarSchedule({
  requestContext,
  input,
  year,
  month,
}: {
  readonly requestContext: RequestContext
  readonly input: CalendarInput
  readonly year: number
  readonly month: number
}): Promise<CalendarReadModel['scheduleItems']> {
  const from = Date.UTC(year, month, 1) - 86_400_000
  const to = Date.UTC(year, month + 1, 1) + 86_400_000
  const requestDeps = await crmDeps(requestContext)
  const scheduleResult = await listScheduleItems(requestDeps, {
    from,
    to,
    ...scheduleScope(input, requestContext),
  })
  const parentRecords = scheduleResult.ok
    ? await Promise.all(scheduleResult.value.map((item) => parentDetails(requestDeps, item)))
    : []
  const manager = isManagerUp(requestContext.actor)
  if (!scheduleResult.ok) return []
  return scheduleResult.value.map((item, index) => ({
    ...item,
    assigneeIds: item.assigneeIds.map(String),
    parentTitle: parentRecords[index]?.title ?? null,
    assignableIds: manager ? (parentRecords[index]?.assignableIds ?? []) : [],
  }))
}

async function calendarTasks({
  requestContext,
  input,
  year,
  month,
}: {
  readonly requestContext: RequestContext
  readonly input: CalendarInput
  readonly year: number
  readonly month: number
}) {
  const request = { depth: 0, overrideAccess: false as const, req: requestContext.req }
  const workflowPage = await requestContext.payload.find({
    collection: 'workflows',
    ...request,
    pagination: false,
    where: { recordType: { equals: 'task' } },
  })
  const workflows = workflowPage.docs as readonly object[]
  const categories = stageCategories(workflows)
  const finished = [...categories].filter(([, category]) => FINISHED.has(category)).map(([id]) => id)
  const scopedInput = isManagerUp(requestContext.actor) ? input : { mine: true }
  const inMonth = monthClauses(year, month, requiredPeople(scopedInput, String(requestContext.actor.id)))
  const taskPage = await requestContext.payload.find({
    collection: 'tasks',
    ...request,
    // Finished tasks are not drawn, so they are not read; the total says whether the month was cut short.
    where: { and: finished.length === 0 ? inMonth : [...inMonth, { stageId: { not_in: finished } }] },
    // A real page: with `pagination: false` Payload ignores the limit and reads every task in the month.
    page: 1,
    limit: CALENDAR_LIMIT,
    select: { id: true, title: true, stageId: true, priority: true, dueAt: true, startAt: true, updatedAt: true },
  })
  return { tasks: mapTasks(taskPage.docs, categories), capped: taskPage.totalDocs > CALENDAR_LIMIT }
}

/** Loads the selected month's scoped tasks and time-specific CRM events. */
export async function loadCalendarReadModel(
  input: CalendarInput,
  context?: RequestContext,
): Promise<CalendarReadModel> {
  const [requestContext, settings] = await Promise.all([context ?? getRequestContext(), getWorkspaceSettings()])
  const timeZone = text(settings, 'timezone') || 'UTC'
  const { year, month } = selectedMonth(input.year, input.month, timeZone)
  const query = { requestContext, input, year, month }
  const [taskData, scheduleItems] = await Promise.all([calendarTasks(query), calendarSchedule(query)])
  return {
    actorId: String(requestContext.actor.id),
    manager: isManagerUp(requestContext.actor),
    ...taskData,
    scheduleItems,
    timeZone,
    calendarYear: year,
    calendarMonth: month,
    weekStartsOn: field(settings, 'weekStartsOn') === 0 ? 0 : 1,
    locale: normalizeLocale(field(settings, 'locale')),
  }
}

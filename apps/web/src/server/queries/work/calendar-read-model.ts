import { getWorkspaceSettings } from '../../auth/context'
import { normalizeLocale, type Locale } from '../../../i18n/config'
import type { StageCategory } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import type { Where } from 'payload'

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
  readonly tasks: readonly CalendarTask[]
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
  const localDate = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(Date.now())
  const currentYear = Number(localDate.find((part) => part.type === 'year')?.value)
  const currentMonth = Number(localDate.find((part) => part.type === 'month')?.value) - 1
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

/** Reads only tasks in the selected calendar month, plus workflow labels and calendar settings. */
export async function loadCalendarReadModel(
  yearInput: unknown,
  monthInput: unknown,
  context?: RequestContext,
): Promise<CalendarReadModel> {
  const [requestContext, settings] = await Promise.all([context ?? getRequestContext(), getWorkspaceSettings()])
  const timeZone = text(settings, 'timezone') || 'UTC'
  const { year, month } = selectedMonth(yearInput, monthInput, timeZone)
  // Extra UTC days cover all timezone offsets; the calendar filters returned events by local date.
  const from = Date.UTC(year, month, 1) - 86_400_000
  const to = Date.UTC(year, month + 1, 1) + 86_400_000
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
  const inMonth: Where[] = [{ dueAt: { greater_than_equal: from } }, { dueAt: { less_than: to } }]
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
  const locale = normalizeLocale(field(settings, 'locale'))
  return {
    tasks: mapTasks(taskPage.docs, categories),
    capped: taskPage.totalDocs > CALENDAR_LIMIT,
    timeZone,
    calendarYear: year,
    calendarMonth: month,
    weekStartsOn: field(settings, 'weekStartsOn') === 0 ? 0 : 1,
    locale,
  }
}

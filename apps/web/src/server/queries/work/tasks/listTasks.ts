import { createTaskRepository } from '@ops/adapter-payload'
import { getRequestContext, type RequestContext } from '../../../work/deps'
import { toTaskListItem, type PeopleById } from './task-items'
import type { TaskListItem, TaskListQuery, TaskListResult, TaskSort, TaskSortKey } from './types'

// Every list page shows 50 rows with server pagination (decision D-34).
const PAGE_SIZE = 50
const DEFAULT_SORT: TaskSort = { key: 'dueAt', desc: false }
const SORT_KEYS: readonly TaskSortKey[] = ['title', 'stage', 'priority', 'dueAt']
const PRIORITY_RANK = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 } as const
const NO_DUE_DATE = Number.MAX_SAFE_INTEGER

type Compare = (a: TaskListItem, b: TaskListItem) => number

const COMPARE: Record<TaskSortKey, Compare> = {
  title: (a, b) => a.title.localeCompare(b.title),
  stage: (a, b) => a.stage.position - b.stage.position,
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  dueAt: (a, b) => (a.dueAt ?? NO_DUE_DATE) - (b.dueAt ?? NO_DUE_DATE),
}

/** Parses the `sort` URL value (`key` ascending, `-key` descending); unknown values fall back to due date ascending. */
export function parseTaskSort(value: string | undefined): TaskSort {
  const desc = value?.startsWith('-') ?? false
  const key = desc ? value?.slice(1) : value
  const match = SORT_KEYS.find((candidate) => candidate === key)
  return match === undefined ? DEFAULT_SORT : { key: match, desc }
}

/** Formats a sort as its `sort` URL value. */
export function formatTaskSort(sort: TaskSort): string {
  return sort.desc ? `-${sort.key}` : sort.key
}

/** Parses the 1-based `page` URL value; anything other than a positive integer yields page 1. */
export function parseTaskPage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

// Names come through the users collection's access, so staff only see names they may read.
async function loadPeople({ payload, req }: RequestContext, ids: readonly string[]): Promise<PeopleById> {
  if (ids.length === 0) return new Map()
  const where = { id: { in: ids } }
  const { docs } = await payload.find({
    collection: 'users',
    where,
    depth: 0,
    limit: ids.length,
    overrideAccess: false,
    req,
  })
  return new Map(docs.map((user) => [user.id, { name: user.name, email: user.email }]))
}

/** Reads one page of the tasks the signed-in user may see, with the id as tie-breaker so pages never overlap. */
export async function listTasks(query: TaskListQuery, requestContext?: RequestContext): Promise<TaskListResult> {
  const context = requestContext ?? (await getRequestContext())
  const tasks = createTaskRepository(context.req)
  const [workflow, records] = await Promise.all([tasks.loadTaskWorkflow(), tasks.listTasks()])
  const people = await loadPeople(context, [...new Set(records.flatMap((task) => task.assigneeIds))])
  const direction = query.sort.desc ? -1 : 1
  const compare = COMPARE[query.sort.key]
  const stageCategories = new Map(workflow.stages.map((stage) => [stage.id, stage.category]))
  const visibleRecords = records.filter((task) => {
    if (query.view === 'mine') return task.assigneeIds.some((id) => String(id) === String(context.actor.id))
    if (query.view === 'open') {
      const category = stageCategories.get(task.stageId)
      const terminal = new Set(['done_success', 'done_failure', 'cancelled'])
      return category === undefined || !terminal.has(category)
    }
    return true
  })
  const sorted = visibleRecords
    .map((task) => toTaskListItem(task, workflow, people))
    .sort((a, b) => direction * compare(a, b) || a.id.localeCompare(b.id))
  const start = (query.page - 1) * PAGE_SIZE
  return { items: sorted.slice(start, start + PAGE_SIZE), total: sorted.length, page: query.page, pageSize: PAGE_SIZE }
}

import { createTaskRepository, listTaskPage } from '@ops/adapter-payload'
import type { TaskRecord } from '@ops/module-work'
import type { Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '../../../work/deps'
import { toTaskListItem, type PeopleById } from './task-items'
import { loadTaskContexts } from './task-contexts'
import type { TaskListItem, TaskListQuery, TaskListResult, TaskSort, TaskSortKey } from './types'
import type { Where } from 'payload'

// Every list page shows 50 rows with server pagination (decision D-34).
const PAGE_SIZE = 50
const DEFAULT_SORT: TaskSort = { key: 'dueAt', desc: false }
const SORT_KEYS: readonly TaskSortKey[] = ['title', 'stage', 'priority', 'dueAt']
const PRIORITY_RANK = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 } as const
const NO_DUE_DATE = Number.MAX_SAFE_INTEGER
const TERMINAL_CATEGORIES = new Set(['done_success', 'done_failure', 'cancelled'])

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

function taskWhere(query: TaskListQuery, workflow: Workflow, actorId: string): Where {
  if (query.view === 'mine') return { assignees: { in: [actorId] } }
  if (query.view !== 'open') return {}
  return {
    or: [
      {
        stageId: {
          not_in: workflow.stages.filter((stage) => TERMINAL_CATEGORIES.has(stage.category)).map((stage) => stage.id),
        },
      },
      { stageId: { exists: false } },
    ],
  }
}

async function listDueTasks({
  context,
  workflow,
  query,
  where,
}: Readonly<{
  context: RequestContext
  workflow: Workflow
  query: TaskListQuery
  where: Where
}>): Promise<TaskListResult> {
  const page = await listTaskPage(context.req, {
    where,
    sort: query.sort.desc ? ['-dueAt', 'id'] : ['dueAt', 'id'],
    page: query.page,
    limit: PAGE_SIZE,
    dueAtNullsLast: true,
  })
  const people = await loadPeople(context, [...new Set(page.records.flatMap((task) => task.assigneeIds))])
  const contexts = await loadTaskContexts(context, page.records)
  return {
    items: page.records.map((task) =>
      toTaskListItem(task, { workflow, people, context: contexts.get(task.id) ?? null }),
    ),
    total: page.total,
    page: query.page,
    pageSize: PAGE_SIZE,
  }
}

async function listSortedTaskPage({
  context,
  query,
  workflow,
  records,
}: Readonly<{
  context: RequestContext
  query: TaskListQuery
  workflow: Workflow
  records: readonly TaskRecord[]
}>): Promise<TaskListResult> {
  const stageCategories = new Map(workflow.stages.map((stage) => [stage.id, stage.category]))
  const people = await loadPeople(context, [...new Set(records.flatMap((task) => task.assigneeIds))])
  const visibleRecords = records.filter((task) => {
    if (query.view === 'mine') return task.assigneeIds.some((id) => String(id) === String(context.actor.id))
    if (query.view !== 'open') return true
    const category = stageCategories.get(task.stageId)
    return category === undefined || !TERMINAL_CATEGORIES.has(category)
  })
  const direction = query.sort.desc ? -1 : 1
  const compare = COMPARE[query.sort.key]
  const sorted = visibleRecords
    .map((task) => ({ task, item: toTaskListItem(task, { workflow, people }) }))
    .sort((a, b) => direction * compare(a.item, b.item) || a.item.id.localeCompare(b.item.id))
  const page = sorted.slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE)
  const contexts = await loadTaskContexts(
    context,
    page.map(({ task }) => task),
  )
  return {
    items: page.map(({ task }) => toTaskListItem(task, { workflow, people, context: contexts.get(task.id) ?? null })),
    total: sorted.length,
    page: query.page,
    pageSize: PAGE_SIZE,
  }
}

/** Reads one page of the tasks the signed-in user may see, with the id as tie-breaker so pages never overlap. */
export async function listTasks(query: TaskListQuery, requestContext?: RequestContext): Promise<TaskListResult> {
  const context = requestContext ?? (await getRequestContext())
  const tasks = createTaskRepository(context.req)
  const workflow = await tasks.loadTaskWorkflow()
  const where = taskWhere(query, workflow, String(context.actor.id))
  if (query.sort.key === 'dueAt') return listDueTasks({ context, workflow, query, where })
  const records = await tasks.listTasks()
  return listSortedTaskPage({ context, query, workflow, records })
}

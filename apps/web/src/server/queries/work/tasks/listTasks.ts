import { createTaskRepository, listTaskPage } from '@ops/adapter-payload'
import type { TaskRecord } from '@ops/module-work'
import type { Workflow } from '@ops/platform'
import { getRequestContext, type RequestContext } from '@/server/container'
import { loadPeople } from '@/server/people'
import { toTaskListItem } from './task-items'
import { pageAcrossRuns, rankRuns } from './ranked-runs'
import { loadTaskContexts } from './task-contexts'
import type { TaskListQuery, TaskListResult, TaskSort, TaskSortKey } from './types'
import type { Where } from 'payload'
import { workflowOrThrow } from '@/server/workflow-result'

// Every list page shows 50 rows with server pagination (decision D-34).
const PAGE_SIZE = 50
const DEFAULT_SORT: TaskSort = { key: 'dueAt', desc: false }
const SORT_KEYS: readonly TaskSortKey[] = ['title', 'stage', 'priority', 'dueAt']
const TERMINAL_CATEGORIES = new Set(['done_success', 'done_failure', 'cancelled'])

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

function viewWhere(query: TaskListQuery, workflow: Workflow, actorId: string): Where {
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

function taskWhere(query: TaskListQuery, workflow: Workflow, actorId: string): Where {
  const view = viewWhere(query, workflow, actorId)
  const search = query.search?.trim() ?? ''
  return search === '' ? view : { and: [view, { title: { contains: search } }] }
}

interface PageArgs {
  readonly context: RequestContext
  readonly workflow: Workflow
  readonly query: TaskListQuery
}

/** Turns one page of stored tasks into list rows with their people and the record each belongs to. */
async function toListResult(
  { context, workflow, query }: PageArgs,
  page: Readonly<{ records: readonly TaskRecord[]; total: number }>,
): Promise<TaskListResult> {
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

async function listDueTasks(args: PageArgs & Readonly<{ where: Where }>): Promise<TaskListResult> {
  const { context, query, where } = args
  const page = await listTaskPage(context.req, {
    where,
    sort: query.sort.desc ? ['-dueAt', 'id'] : ['dueAt', 'id'],
    page: query.page,
    limit: PAGE_SIZE,
    dueAtNullsLast: true,
  })
  return toListResult(args, page)
}

async function listTitleTasks(args: PageArgs & Readonly<{ where: Where }>): Promise<TaskListResult> {
  const { context, query, where } = args
  const page = await listTaskPage(context.req, {
    where,
    sort: query.sort.desc ? ['-title', '-id'] : ['title', 'id'],
    page: query.page,
    limit: PAGE_SIZE,
  })
  return toListResult(args, page)
}

/** Priority and stage rank by a fixed order, so each value is read as its own run and the runs are joined in that order. */
async function listRankedTasks(args: PageArgs & Readonly<{ where: Where }>): Promise<TaskListResult> {
  const { context, query, workflow, where } = args
  const runs = rankRuns(query.sort.key, workflow)
  const ordered = query.sort.desc ? [...runs].reverse() : runs
  const page = await pageAcrossRuns({
    runs: ordered.map((run) => ({ and: [where, run] })),
    read: (runWhere, window) => listTaskPage(context.req, { where: runWhere, sort: ['rank', 'id'], ...window }),
    size: PAGE_SIZE,
    page: query.page,
  })
  return toListResult(args, page)
}

/** Reads one page of the tasks the signed-in user may see, with the id as tie-breaker so pages never overlap. */
export async function listTasks(query: TaskListQuery, requestContext?: RequestContext): Promise<TaskListResult> {
  const context = requestContext ?? (await getRequestContext())
  const tasks = createTaskRepository(context.req)
  const workflow = workflowOrThrow(await tasks.loadTaskWorkflow())
  const where = taskWhere(query, workflow, String(context.actor.id))
  const args = { context, workflow, query, where }
  if (query.sort.key === 'dueAt') return listDueTasks(args)
  if (query.sort.key === 'title') return listTitleTasks(args)
  return listRankedTasks(args)
}

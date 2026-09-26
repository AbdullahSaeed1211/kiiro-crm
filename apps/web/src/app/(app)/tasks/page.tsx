/* eslint-disable max-lines -- task table owns its read-model cells and URL state in one route boundary. */

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@ops/ui/components/ui/avatar'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
  type DataTablePaginationState,
  type DataTableRow,
} from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskViewMenu } from './TaskViewMenu'
import { TaskWorkspaceViews } from './TaskWorkspaceViews'
import { taskHref } from '../task-navigation'
import { CircleAlert, ListTodo, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { formatDate } from '../../../i18n/format'
import { formatTaskSort, listTasks, parseTaskPage, parseTaskSort } from '../../../server/queries/work/tasks/listTasks'
import { listSavedViews, type SavedViewSummary } from '../../../server/queries/settings/listSavedViews'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { getRequestContext } from '@/server/container'
import type {
  TaskListItem,
  TaskListResult,
  TaskPriority,
  TaskSort,
  TaskSortKey,
} from '../../../server/queries/work/tasks/types'
import { initials } from '@ops/ui/lib/initials'
import { firstParam } from '../search-params'
import { StagePill } from '@ops/ui/composites/StagePill'

const PAGE_TITLE = 'Tasks'
const AVATAR_LIMIT = 3

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

function labelsFor(locale: Locale): DataTableLabels {
  const copy = TASK_COPY[locale]
  return {
    selectAll: copy.selectAll,
    selectRow: copy.selectRow,
    columns: copy.columns,
    previous: copy.previous,
    next: copy.next,
    range: copy.range,
    selected: copy.selected,
  }
}

const PRIORITY_ICON: Record<TaskPriority, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

// Tenant timezone formatting arrives with settings (decision D-39); the spike shows UTC dates.

function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}

function PriorityCell({ priority, locale }: Readonly<{ priority: TaskPriority; locale: Locale }>) {
  const Icon = PRIORITY_ICON[priority]
  const label = TASK_COPY[locale][priority === 'none' ? 'noPriority' : priority]
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        aria-hidden
        className={priority === 'urgent' ? 'size-4 text-destructive' : 'size-4 text-muted-foreground'}
      />
      {label}
    </span>
  )
}

function AssigneesCell({ assignees }: Readonly<{ assignees: TaskListItem['assignees'] }>) {
  if (assignees.length === 0) return <EmptyValue />
  const extra = assignees.length - AVATAR_LIMIT
  return (
    <AvatarGroup>
      {assignees.slice(0, AVATAR_LIMIT).map((person) => (
        <Avatar key={person.id} size="sm" title={person.name}>
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 ? <AvatarGroupCount className="text-xs">+{extra}</AvatarGroupCount> : null}
    </AvatarGroup>
  )
}

function DueCell({ dueAt, locale }: Readonly<{ dueAt: number | null; locale: Locale }>) {
  if (dueAt === null) return <EmptyValue />
  return (
    <time dateTime={new Date(dueAt).toISOString()} className="tabular-nums">
      {formatDate(dueAt, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
    </time>
  )
}

function toRow({
  task,
  returnTo,
  locale,
}: Readonly<{ task: TaskListItem; returnTo: string; locale: Locale }>): DataTableRow {
  return {
    id: task.id,
    href: taskHref(task.id, returnTo),
    cells: {
      title: (
        <Link
          href={taskHref(task.id, returnTo)}
          className="font-medium hover:text-primary hover:underline"
          data-task-link-id={task.id}
        >
          {task.title}
        </Link>
      ),
      stage: <StagePill name={task.stage.name} color={task.stage.color} size="sm" />,
      priority: <PriorityCell priority={task.priority} locale={locale} />,
      assignees: <AssigneesCell assignees={task.assignees} />,
      dueAt: <DueCell dueAt={task.dueAt} locale={locale} />,
      context:
        task.context === null ? (
          <EmptyValue />
        ) : (
          <Link href={task.context.href} className="font-medium hover:text-primary hover:underline">
            {task.context.label}
          </Link>
        ),
    },
  }
}

function taskColumns({
  sort,
  view,
  locale,
}: Readonly<{ sort: TaskSort; view: string; locale: Locale }>): DataTableColumn[] {
  const copy = TASK_COPY[locale]
  // Clicking the active ascending column flips it to descending; any other click sorts ascending from page 1.
  const sortHref = (key: TaskSortKey): string =>
    `?${new URLSearchParams({ sort: formatTaskSort({ key, desc: sort.key === key && !sort.desc }), view }).toString()}`
  return [
    { id: 'title', header: copy.title, sortHref: sortHref('title'), hideable: false },
    { id: 'stage', header: copy.stage, sortHref: sortHref('stage') },
    { id: 'priority', header: copy.priority, sortHref: sortHref('priority') },
    { id: 'assignees', header: copy.assignees },
    { id: 'dueAt', header: copy.due, sortHref: sortHref('dueAt') },
    { id: 'context', header: copy.project },
  ]
}

function paginationOf({
  result,
  sort,
  view,
}: Readonly<{ result: TaskListResult; sort: TaskSort; view: string }>): DataTablePaginationState {
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize))
  const pageHref = (page: number): string =>
    `?${new URLSearchParams({ sort: formatTaskSort(sort), page: String(page), view }).toString()}`
  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    ...(result.page > 1 ? { previousHref: pageHref(result.page - 1) } : {}),
    ...(result.page < pageCount ? { nextHref: pageHref(result.page + 1) } : {}),
  }
}

function parseTaskView(value: string | undefined, savedViews: readonly SavedViewSummary[]): string {
  if (value !== undefined && savedViews.some((view) => view.id === value)) return value
  return value === 'open' || value === 'mine' ? value : 'all'
}

// eslint-disable-next-line complexity -- validates a small persisted sort object defensively.
function savedViewSort(view: SavedViewSummary | undefined, fallback: TaskSort): TaskSort {
  if (typeof view?.sort !== 'object' || view.sort === null || Array.isArray(view.sort)) return fallback
  const value = view.sort as Record<string, unknown>
  const key = value.key
  if (key !== 'title' && key !== 'stage' && key !== 'priority' && key !== 'dueAt') return fallback
  return { key, desc: value.desc === true }
}

function savedViewMode(view: SavedViewSummary | undefined): 'all' | 'open' | 'mine' {
  if (typeof view?.filter !== 'object' || view.filter === null || Array.isArray(view.filter)) return 'all'
  const status = (view.filter as Record<string, unknown>).status
  return status === 'open' || status === 'mine' ? status : 'all'
}

function taskModeOf(view: string, savedView: SavedViewSummary | undefined): 'all' | 'open' | 'mine' {
  if (savedView !== undefined) return savedViewMode(savedView)
  return view === 'open' || view === 'mine' ? view : 'all'
}

/** Tasks list (spec §17.5). */
export default async function TasksPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const {
    sort: sortParam,
    page: pageParam,
    view: viewParam,
    relatedType,
    relatedId,
    title: titleParam,
  } = await searchParams
  const context = await getRequestContext()
  const [savedViews, locale] = await Promise.all([listSavedViews('task', context), loadWorkspaceLocale()])
  const copy = TASK_COPY[locale]
  const sort = parseTaskSort(firstParam(sortParam))
  const view = parseTaskView(firstParam(viewParam), savedViews)
  const selectedSavedView = savedViews.find((savedView) => savedView.id === view)
  const effectiveSort = selectedSavedView === undefined ? sort : savedViewSort(selectedSavedView, sort)
  const taskMode = taskModeOf(view, selectedSavedView)
  const returnToParams = new URLSearchParams({
    sort: formatTaskSort(sort),
    page: String(parseTaskPage(firstParam(pageParam))),
    view,
  })
  const returnTo = `/tasks?${returnToParams.toString()}`
  const result = await listTasks(
    {
      page: parseTaskPage(firstParam(pageParam)),
      sort: effectiveSort,
      view: taskMode,
    },
    context,
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.allTasks }]} />
      <PageContent>
        <PageHeader
          title={copy.allTasks}
          count={result.total}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TaskWorkspaceViews active="table" locale={locale} />
              <Link
                href="/tasks/new"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                New task
              </Link>
              <TaskViewMenu
                selectedId={view}
                locale={locale}
                customViews={savedViews.map((savedView) => ({
                  id: savedView.id,
                  label: savedView.name,
                  pinned: savedView.pinned,
                }))}
              />
              <TaskCreateForm
                relatedType={firstParam(relatedType)}
                relatedId={firstParam(relatedId)}
                initialTitle={firstParam(titleParam)}
              />
            </div>
          }
        />
        <DataTable
          // A new sort or page remounts the table, so row selection does not carry over to other rows.
          key={`${formatTaskSort(sort)}:${String(result.page)}`}
          columns={taskColumns({ sort: effectiveSort, view, locale })}
          rows={result.items.map((task) => toRow({ task, returnTo, locale }))}
          sort={{ id: effectiveSort.key, desc: effectiveSort.desc }}
          pagination={paginationOf({ result, sort: effectiveSort, view })}
          labels={labelsFor(locale)}
          emptyState={<EmptyState icon={ListTodo} title={copy.noTasks} description={copy.noTasksDescription} />}
        />
      </PageContent>
    </>
  )
}

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
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { formatTaskSort, listTasks, parseTaskPage, parseTaskSort } from '../../../server/queries/work/tasks/listTasks'
import { listSavedViews, type SavedViewSummary } from '../../../server/queries/settings/listSavedViews'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { getRequestContext } from '../../../server/work/deps'
import type {
  TaskListItem,
  TaskListResult,
  TaskPriority,
  TaskSort,
  TaskSortKey,
  TaskStageColor,
} from '../../../server/queries/work/tasks/types'

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

const STAGE_PILL: Record<TaskStageColor, string> = {
  gray: 'bg-stage-gray/15',
  blue: 'bg-stage-blue/15',
  green: 'bg-stage-green/15',
  amber: 'bg-stage-amber/15',
  red: 'bg-stage-red/15',
  violet: 'bg-stage-violet/15',
  teal: 'bg-stage-teal/15',
  pink: 'bg-stage-pink/15',
}

const STAGE_DOT: Record<TaskStageColor, string> = {
  gray: 'bg-stage-gray',
  blue: 'bg-stage-blue',
  green: 'bg-stage-green',
  amber: 'bg-stage-amber',
  red: 'bg-stage-red',
  violet: 'bg-stage-violet',
  teal: 'bg-stage-teal',
  pink: 'bg-stage-pink',
}

const PRIORITY_ICON: Record<TaskPriority, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

// Tenant timezone formatting arrives with settings (decision D-39); the spike shows UTC dates.
const DUE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}

function StageCell({ stage }: Readonly<{ stage: TaskListItem['stage'] }>) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-medium ${STAGE_PILL[stage.color]}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[stage.color]}`} />
      {stage.name}
    </span>
  )
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
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

function DueCell({ dueAt }: Readonly<{ dueAt: number | null }>) {
  if (dueAt === null) return <EmptyValue />
  return (
    <time dateTime={new Date(dueAt).toISOString()} className="tabular-nums">
      {DUE_FORMAT.format(dueAt)}
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
    cells: {
      title: (
        <a href={taskHref(task.id, returnTo)} className="font-medium hover:text-primary hover:underline">
          {task.title}
        </a>
      ),
      stage: <StageCell stage={task.stage} />,
      priority: <PriorityCell priority={task.priority} locale={locale} />,
      assignees: <AssigneesCell assignees={task.assignees} />,
      dueAt: <DueCell dueAt={task.dueAt} />,
      context: task.context === null ? <EmptyValue /> : task.context.label,
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

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
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
  const [savedViews, locale] = await Promise.all([listSavedViews('task', context), loadWorkspaceLocale(context)])
  const copy = TASK_COPY[locale]
  const sort = parseTaskSort(firstValue(sortParam))
  const view = parseTaskView(firstValue(viewParam), savedViews)
  const selectedSavedView = savedViews.find((savedView) => savedView.id === view)
  const effectiveSort = selectedSavedView === undefined ? sort : savedViewSort(selectedSavedView, sort)
  const taskMode = taskModeOf(view, selectedSavedView)
  const returnToParams = new URLSearchParams({
    sort: formatTaskSort(sort),
    page: String(parseTaskPage(firstValue(pageParam))),
    view,
  })
  const returnTo = `/tasks?${returnToParams.toString()}`
  const result = await listTasks(
    {
      page: parseTaskPage(firstValue(pageParam)),
      sort: effectiveSort,
      view: taskMode,
    },
    context,
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.table }]} />
      <PageContent>
        <PageHeader
          title={copy.table}
          count={result.total}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TaskWorkspaceViews active="table" locale={locale} />
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
                relatedType={firstValue(relatedType)}
                relatedId={firstValue(relatedId)}
                initialTitle={firstValue(titleParam)}
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

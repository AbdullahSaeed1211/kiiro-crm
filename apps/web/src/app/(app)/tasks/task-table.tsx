import {
  type DataTableColumn,
  type DataTableLabels,
  type DataTablePaginationState,
  type DataTableRow,
  EmptyValue,
  paginationFor,
} from '@ops/ui/composites/DataTable'
import { StagePill } from '@ops/ui/composites/StagePill'
import Link from 'next/link'
import { PriorityCell } from './priority-cell'
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { formatDate } from '../../../i18n/format'
import { formatTaskSort } from '../../../server/queries/work/tasks/listTasks'
import type { TaskListItem, TaskListResult, TaskSort, TaskSortKey } from '../../../server/queries/work/tasks/types'
import { taskHref } from '../task-navigation'
import { DASHBOARD_TODAY_COPY } from '../../../i18n/dashboard-today-copy'
import { CurrentFocusButton } from '../current-focus-button'

/** Translated strings of the task table. */
export function labelsFor(locale: Locale): DataTableLabels {
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

function ResponsibilityCell({ task, locale }: Readonly<{ task: TaskListItem; locale: Locale }>) {
  if (task.primaryAssignee === null) return <EmptyValue />
  const collaborators = task.assignees.filter((person) => person.id !== task.primaryAssignee?.id).length
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{task.primaryAssignee.name}</span>
      {collaborators > 0 ? (
        <span
          className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
          title={TASK_COPY[locale].collaborators}
        >
          +{collaborators}
        </span>
      ) : null}
    </span>
  )
}

function BlockedCell({ task, locale }: Readonly<{ task: TaskListItem; locale: Locale }>) {
  if (!task.blocked) return null
  const label = TASK_COPY[locale].blocked
  const detail = [task.blockedReason, task.waitingOn].filter(Boolean).join(' · ')
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300"
      title={detail || label}
    >
      {label}
      {task.waitingOn ? ` · ${task.waitingOn}` : ''}
    </span>
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

/** One table row for a task; its title links back to this list. */
export function toRow({
  task,
  returnTo,
  locale,
  group,
  actorId,
  currentFocusTaskId,
}: Readonly<{
  task: TaskListItem
  returnTo: string
  locale: Locale
  group?: string
  actorId: string
  currentFocusTaskId: string | null
}>): DataTableRow {
  const assignedToMe = task.assignees.some((assignee) => assignee.id === actorId)
  const active = currentFocusTaskId === task.id
  return {
    id: task.id,
    href: taskHref(task.id, returnTo),
    ...(group === undefined ? {} : { group }),
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
      assignees: <ResponsibilityCell task={task} locale={locale} />,
      dueAt: <DueCell dueAt={task.dueAt} locale={locale} />,
      context:
        task.context === null ? (
          <EmptyValue />
        ) : (
          <Link href={task.context.href} className="font-medium hover:text-primary hover:underline">
            {task.context.label}
          </Link>
        ),
      focus:
        active || (assignedToMe && !task.isFinished) ? (
          <CurrentFocusButton taskId={task.id} active={active} locale={locale} />
        ) : null,
      blocker: <BlockedCell task={task} locale={locale} />,
    },
  }
}

/** A list address that keeps the sort, view and search; an empty search is left out. */
function listQuery({ search, assignee, ...params }: Readonly<Record<string, string>>): string {
  const filters = { ...(search === '' ? {} : { q: search }), ...(assignee === '' ? {} : { assignee }) }
  return `?${new URLSearchParams({ ...params, ...filters }).toString()}`
}

/** Columns with sort links that keep the selected view. */
export function taskColumns({
  sort,
  view,
  locale,
  search = '',
  assignee = '',
  due = '',
}: Readonly<{
  sort: TaskSort
  view: string
  locale: Locale
  search?: string
  assignee?: string
  due?: string
}>): DataTableColumn[] {
  const copy = TASK_COPY[locale]
  const focusCopy = DASHBOARD_TODAY_COPY[locale]
  // Clicking the active ascending column flips it to descending; any other click sorts ascending from page 1.
  const sortHref = (key: TaskSortKey): string =>
    listQuery({
      sort: formatTaskSort({ key, desc: sort.key === key && !sort.desc }),
      view,
      search,
      assignee,
      ...(due === '' ? {} : { due }),
    })
  return [
    { id: 'title', header: copy.title, sortHref: sortHref('title'), hideable: false },
    { id: 'stage', header: copy.stage, sortHref: sortHref('stage') },
    { id: 'priority', header: copy.priority, sortHref: sortHref('priority') },
    { id: 'assignees', header: copy.assignees },
    { id: 'blocker', header: copy.blockers },
    { id: 'dueAt', header: copy.due, sortHref: sortHref('dueAt') },
    { id: 'context', header: copy.project, sortHref: sortHref('project') },
    { id: 'focus', header: focusCopy.focusColumn },
  ]
}

/** Previous and next links that keep the sort and view. */
export function paginationOf({
  result,
  sort,
  view,
  search = '',
  assignee = '',
  due = '',
}: Readonly<{
  result: TaskListResult
  sort: TaskSort
  view: string
  search?: string
  assignee?: string
  due?: string
}>): DataTablePaginationState {
  return paginationFor({
    ...result,
    href: (page) =>
      listQuery({
        sort: formatTaskSort(sort),
        page: String(page),
        view,
        search,
        assignee,
        ...(due === '' ? {} : { due }),
      }),
  })
}

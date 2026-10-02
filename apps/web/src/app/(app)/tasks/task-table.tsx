import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@ops/ui/components/ui/avatar'
import {
  type DataTableColumn,
  type DataTableLabels,
  type DataTablePaginationState,
  type DataTableRow,
  EmptyValue,
  paginationFor,
} from '@ops/ui/composites/DataTable'
import { StagePill } from '@ops/ui/composites/StagePill'
import { initials } from '@ops/ui/lib/initials'
import { CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { formatDate } from '../../../i18n/format'
import { formatTaskSort } from '../../../server/queries/work/tasks/listTasks'
import type {
  TaskListItem,
  TaskListResult,
  TaskPriority,
  TaskSort,
  TaskSortKey,
} from '../../../server/queries/work/tasks/types'
import { taskHref } from '../task-navigation'

const AVATAR_LIMIT = 3

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

const PRIORITY_ICON: Record<TaskPriority, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
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

/** One table row for a task; its title links back to this list. */
export function toRow({
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

/** A list address that keeps the sort, view and search; an empty search is left out. */
function listQuery({ search, ...params }: Readonly<Record<string, string>>): string {
  return `?${new URLSearchParams(search === '' ? params : { ...params, q: search }).toString()}`
}

/** Columns with sort links that keep the selected view. */
export function taskColumns({
  sort,
  view,
  locale,
  search = '',
}: Readonly<{ sort: TaskSort; view: string; locale: Locale; search?: string }>): DataTableColumn[] {
  const copy = TASK_COPY[locale]
  // Clicking the active ascending column flips it to descending; any other click sorts ascending from page 1.
  const sortHref = (key: TaskSortKey): string =>
    listQuery({ sort: formatTaskSort({ key, desc: sort.key === key && !sort.desc }), view, search })
  return [
    { id: 'title', header: copy.title, sortHref: sortHref('title'), hideable: false },
    { id: 'stage', header: copy.stage, sortHref: sortHref('stage') },
    { id: 'priority', header: copy.priority, sortHref: sortHref('priority') },
    { id: 'assignees', header: copy.assignees },
    { id: 'dueAt', header: copy.due, sortHref: sortHref('dueAt') },
    { id: 'context', header: copy.project },
  ]
}

/** Previous and next links that keep the sort and view. */
export function paginationOf({
  result,
  sort,
  view,
  search = '',
}: Readonly<{ result: TaskListResult; sort: TaskSort; view: string; search?: string }>): DataTablePaginationState {
  return paginationFor({
    ...result,
    href: (page) => listQuery({ sort: formatTaskSort(sort), page: String(page), view, search }),
  })
}

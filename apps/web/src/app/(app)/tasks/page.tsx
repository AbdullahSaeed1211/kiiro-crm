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
import { CircleAlert, ListTodo, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { formatTaskSort, listTasks, parseTaskPage, parseTaskSort } from '../../../server/queries/work/tasks/listTasks'
import type {
  TaskListItem,
  TaskListResult,
  TaskPriority,
  TaskSort,
  TaskSortKey,
  TaskStageColor,
} from '../../../server/queries/work/tasks/types'

// Default product name until settings.appName exists (decision D-05).
const APP_NAME = 'Workspace'
const PAGE_TITLE = 'Tasks'
const AVATAR_LIMIT = 3

/** Browser tab title, `{page} · {appName}` (spec §17). */
export const metadata: Metadata = { title: `${PAGE_TITLE} · ${APP_NAME}` }

const LABELS: DataTableLabels = {
  selectAll: 'Select all',
  selectRow: 'Select row',
  columns: 'Columns',
  previous: 'Previous',
  next: 'Next',
  range: '{from}–{to} of {total}',
  selected: '{count} selected',
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

const PRIORITY: Record<TaskPriority, Readonly<{ icon: LucideIcon; label: string }>> = {
  none: { icon: Minus, label: 'No priority' },
  low: { icon: SignalLow, label: 'Low' },
  medium: { icon: SignalMedium, label: 'Medium' },
  high: { icon: SignalHigh, label: 'High' },
  urgent: { icon: CircleAlert, label: 'Urgent' },
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

function PriorityCell({ priority }: Readonly<{ priority: TaskPriority }>) {
  const { icon: Icon, label } = PRIORITY[priority]
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

function toRow(task: TaskListItem): DataTableRow {
  return {
    id: task.id,
    cells: {
      title: <span className="font-medium">{task.title}</span>,
      stage: <StageCell stage={task.stage} />,
      priority: <PriorityCell priority={task.priority} />,
      assignees: <AssigneesCell assignees={task.assignees} />,
      dueAt: <DueCell dueAt={task.dueAt} />,
      context: task.context === null ? <EmptyValue /> : task.context.label,
    },
  }
}

function taskColumns(sort: TaskSort): DataTableColumn[] {
  // Clicking the active ascending column flips it to descending; any other click sorts ascending from page 1.
  const sortHref = (key: TaskSortKey): string =>
    `?sort=${formatTaskSort({ key, desc: sort.key === key && !sort.desc })}`
  return [
    { id: 'title', header: 'Title', sortHref: sortHref('title'), hideable: false },
    { id: 'stage', header: 'Stage', sortHref: sortHref('stage') },
    { id: 'priority', header: 'Priority', sortHref: sortHref('priority') },
    { id: 'assignees', header: 'Assignees' },
    { id: 'dueAt', header: 'Due', sortHref: sortHref('dueAt') },
    { id: 'context', header: 'Project' },
  ]
}

function paginationOf(result: TaskListResult, sort: TaskSort): DataTablePaginationState {
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize))
  const pageHref = (page: number): string =>
    `?${new URLSearchParams({ sort: formatTaskSort(sort), page: String(page) }).toString()}`
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

/** Tasks list (spec §17.5). */
export default async function TasksPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { sort: sortParam, page: pageParam } = await searchParams
  const sort = parseTaskSort(firstValue(sortParam))
  const result = await listTasks({ page: parseTaskPage(firstValue(pageParam)), sort })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: PAGE_TITLE }]} />
      <PageContent>
        <PageHeader title={PAGE_TITLE} count={result.total} actions={<TaskCreateForm />} />
        <DataTable
          // A new sort or page remounts the table, so row selection does not carry over to other rows.
          key={`${formatTaskSort(sort)}:${String(result.page)}`}
          columns={taskColumns(sort)}
          rows={result.items.map(toRow)}
          sort={{ id: sort.key, desc: sort.desc }}
          pagination={paginationOf(result, sort)}
          labels={LABELS}
          emptyState={
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Tasks you create or are assigned to show up here."
            />
          }
        />
      </PageContent>
    </>
  )
}

import { Toaster } from '@ops/ui/components/ui/sonner'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { AppShell } from '@ops/ui/composites/AppShell'
import { AppSidebar, type NavGroup } from '@ops/ui/composites/AppSidebar'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Workflow } from '@ops/platform'
import {
  CalendarDays,
  ChartGantt,
  CircleAlert,
  CircleCheckBig,
  LayoutDashboard,
  ListTodo,
  Minus,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getWorkDeps } from '../../../../server/work/deps'
import type { TaskPriority, TaskRecord } from '../../../../server/work/task-repository'
import { TaskBoard } from './TaskBoard'

// Default product name until settings.appName exists (decision D-05).
const APP_NAME = 'Workspace'
const SECTION = 'Tasks'
const SIDEBAR_COOKIE = 'sidebar_state'

/** Browser tab title, `{page} · {appName}` (spec §17). */
export const metadata: Metadata = { title: `Task board · ${APP_NAME}` }

/** Reads per-request task data. */
export const dynamic = 'force-dynamic'

const NAV: readonly NavGroup[] = [
  {
    id: 'general',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'My tasks', href: '/my-tasks', icon: CircleCheckBig },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      { label: SECTION, href: '/tasks', icon: ListTodo, active: true },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays },
      { label: 'Timeline', href: '/timeline', icon: ChartGantt },
    ],
  },
]

const LABELS: KanbanBoardLabels = {
  expand: 'Expand {name}',
  collapse: 'Collapse {name}',
  moveTo: 'Move to…',
  moveFailed: 'Could not move the task',
  conflict: 'Updated by someone else, refreshed',
}

const PRIORITY_ICON: Record<TaskPriority, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

// Tenant timezone formatting arrives with settings (decision D-39); the spike shows UTC dates.
const DUE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function TaskMeta({ task }: Readonly<{ task: TaskRecord }>) {
  const Icon = PRIORITY_ICON[task.priority]
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <Icon aria-hidden className={task.priority === 'urgent' ? 'size-3.5 text-destructive' : 'size-3.5'} />
        {PRIORITY_LABEL[task.priority]}
      </span>
      {task.dueAt === null ? null : (
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden className="size-3.5" />
          <time dateTime={new Date(task.dueAt).toISOString()} className="tabular-nums">
            {DUE_FORMAT.format(task.dueAt)}
          </time>
        </span>
      )}
    </>
  )
}

function toStages(workflow: Workflow): KanbanStage[] {
  return [...workflow.stages]
    .sort((a, b) => a.position - b.position)
    .map(({ id, name, category, color }) => ({ id, name, category, color }))
}

function toCard(task: TaskRecord): KanbanCard {
  const { id, stageId, title, updatedAt } = task
  return { id, stageId, title, updatedAt, meta: <TaskMeta task={task} /> }
}

/** Task board (spec §17.5); renders the application shell itself until M1-L3 moves it into the layout. */
export default async function TaskBoardPage() {
  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE)?.value !== 'false'
  const { tasks } = await getWorkDeps()
  const [workflow, records] = await Promise.all([tasks.loadTaskWorkflow(), tasks.listTasks()])
  return (
    <AppShell
      defaultOpen={sidebarOpen}
      sidebar={<AppSidebar appName={APP_NAME} groups={NAV} />}
      header={<AppHeader breadcrumbs={[{ label: SECTION, href: '/tasks' }, { label: 'Board' }]} />}
    >
      <PageHeader title={SECTION} count={records.length} />
      <TaskBoard stages={toStages(workflow)} cards={records.map(toCard)} labels={LABELS} />
      <Toaster />
    </AppShell>
  )
}

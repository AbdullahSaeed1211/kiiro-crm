import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Workflow } from '@ops/platform'
import { CalendarDays, CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { getWorkDeps } from '../../../../server/work/deps'
import type { TaskPriority, TaskRecord } from '../../../../server/work/task-repository'
import { taskHref } from '../../task-navigation'
import { TaskCreateForm } from '../TaskCreateForm'
import { TaskWorkspaceViews } from '../TaskWorkspaceViews'
import { TaskBoard } from './TaskBoard'

const SECTION = 'Tasks'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Task board' }

/** Reads per-request task data. */
export const dynamic = 'force-dynamic'

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
  return {
    id,
    stageId,
    title,
    updatedAt,
    href: taskHref(id, '/tasks/board'),
    meta: <TaskMeta task={task} />,
  }
}

/** Task board (spec §17.5). */
export default async function TaskBoardPage() {
  const { tasks } = await getWorkDeps()
  const [workflow, records] = await Promise.all([tasks.loadTaskWorkflow(), tasks.listTasks()])
  return (
    <>
      <AppHeader breadcrumbs={[{ label: SECTION, href: '/tasks' }, { label: 'Board' }]} />
      <PageContent>
        <PageHeader
          title={SECTION}
          count={records.length}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TaskWorkspaceViews active="board" />
              <TaskCreateForm />
            </div>
          }
        />
        <TaskBoard stages={toStages(workflow)} cards={records.map(toCard)} labels={LABELS} />
      </PageContent>
    </>
  )
}

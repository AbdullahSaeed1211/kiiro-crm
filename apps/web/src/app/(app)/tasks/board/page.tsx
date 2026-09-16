import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Workflow } from '@ops/platform'
import { CalendarDays, CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { TASK_COPY, type Locale } from '../../../../i18n/config'
import { getWorkDeps } from '../../../../server/work/deps'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { getRequestContext } from '../../../../server/work/deps'
import type { TaskPriority, TaskRecord } from '../../../../server/work/task-repository'
import { taskHref } from '../../task-navigation'
import { TaskCreateForm } from '../TaskCreateForm'
import { TaskWorkspaceViews } from '../TaskWorkspaceViews'
import { TaskBoard } from './TaskBoard'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Task board' }

/** Reads per-request task data. */
export const dynamic = 'force-dynamic'

function labelsFor(locale: Locale): KanbanBoardLabels {
  const copy = TASK_COPY[locale]
  return {
    expand: copy.expand,
    collapse: copy.collapse,
    moveTo: copy.moveTo,
    moveFailed: copy.moveFailed,
    conflict: copy.conflict,
  }
}

const PRIORITY_ICON: Record<TaskPriority, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

function TaskMeta({ task, locale }: Readonly<{ task: TaskRecord; locale: Locale }>) {
  const Icon = PRIORITY_ICON[task.priority]
  const copy = TASK_COPY[locale]
  const priorityLabel = copy[task.priority === 'none' ? 'noPriority' : task.priority]
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <Icon aria-hidden className={task.priority === 'urgent' ? 'size-3.5 text-destructive' : 'size-3.5'} />
        {priorityLabel}
      </span>
      {task.dueAt === null ? null : (
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden className="size-3.5" />
          <time dateTime={new Date(task.dueAt).toISOString()} className="tabular-nums">
            {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(task.dueAt)}
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

function toCard(task: TaskRecord, locale: Locale): KanbanCard {
  const { id, stageId, title, updatedAt } = task
  return {
    id,
    stageId,
    title,
    updatedAt,
    href: taskHref(id, '/tasks/board'),
    meta: <TaskMeta task={task} locale={locale} />,
  }
}

/** Task board (spec §17.5). */
export default async function TaskBoardPage() {
  const context = await getRequestContext()
  const { tasks } = await getWorkDeps(context)
  const locale = await loadWorkspaceLocale()
  const copy = TASK_COPY[locale]
  const [workflow, records] = await Promise.all([tasks.loadTaskWorkflow(), tasks.listTasks()])
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.table, href: '/tasks' }, { label: copy.board }]} />
      <PageContent>
        <PageHeader
          title={copy.board}
          count={records.length}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TaskWorkspaceViews active="board" locale={locale} />
              <TaskCreateForm />
            </div>
          }
        />
        <TaskBoard
          stages={toStages(workflow)}
          cards={records.map((task) => toCard(task, locale))}
          labels={labelsFor(locale)}
        />
      </PageContent>
    </>
  )
}

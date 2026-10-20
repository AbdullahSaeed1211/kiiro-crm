import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Workflow } from '@ops/platform'
import { CalendarDays, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { TASK_COPY, type Locale } from '../../../../i18n/config'
import { workDeps } from '@/server/container'
import { loadBoardTasks } from '../../../../server/queries/work/board-tasks'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { getRequestContext } from '@/server/container'
import { loadTaskPeople } from '../../../../server/queries/work/task-details'
import type { TaskRecord } from '../../../../server/work/task-repository'
import { taskHref } from '../../task-navigation'
import { AssigneeFilter } from '../AssigneeFilter'
import { assigneeOptions, validAssignee } from '../assignee-options'
import { TaskCreateForm } from '../TaskCreateForm'
import { TaskWorkspaceViews } from '../TaskWorkspaceViews'
import { TaskBoard } from './TaskBoard'
import { priorityIcon } from '../priority-cell'
import { workflowOrThrow } from '@/server/workflow-result'

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

function TaskMeta({
  task,
  locale,
  people,
}: Readonly<{ task: TaskRecord; locale: Locale; people: ReadonlyMap<string, string> }>) {
  const Icon = priorityIcon(task.priority)
  const copy = TASK_COPY[locale]
  const priorityLabel = copy[task.priority]
  const assignees = task.assigneeIds.flatMap((id) => {
    const name = people.get(String(id))
    return name === undefined ? [] : [name]
  })
  return (
    <>
      {task.priority === 'none' ? null : (
        <span className="inline-flex items-center gap-1">
          <Icon aria-hidden className={task.priority === 'urgent' ? 'size-3.5 text-destructive' : 'size-3.5'} />
          {priorityLabel}
        </span>
      )}
      {task.dueAt === null ? null : (
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden className="size-3.5" />
          <time dateTime={new Date(task.dueAt).toISOString()} className="tabular-nums">
            {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(task.dueAt)}
          </time>
        </span>
      )}
      <span className="inline-flex items-center gap-1" title={copy.assignees}>
        <Users aria-hidden className="size-3.5" />
        {assignees.length === 0 ? copy.unassigned : assignees.join(', ')}
      </span>
    </>
  )
}

function toStages(workflow: Workflow): KanbanStage[] {
  return [...workflow.stages]
    .sort((a, b) => a.position - b.position)
    .map(({ id, name, category, color }) => ({ id, name, category, color }))
}

function toCard(
  task: TaskRecord,
  context: Readonly<{ locale: Locale; people: ReadonlyMap<string, string> }>,
): KanbanCard {
  const { id, stageId, title, updatedAt } = task
  return {
    id,
    stageId,
    title,
    updatedAt,
    href: taskHref(id, '/tasks/board'),
    meta: <TaskMeta task={task} locale={context.locale} people={context.people} />,
  }
}

/** Task board (spec §17.5). */
export default async function TaskBoardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly view?: string; readonly assignee?: string }> }>) {
  const params = await searchParams
  const mine = params.view === 'mine'
  const context = await getRequestContext()
  const { tasks } = await workDeps(context)
  const locale = await loadWorkspaceLocale()
  const copy = TASK_COPY[locale]
  const workflow = await tasks.loadTaskWorkflow().then(workflowOrThrow)
  const people = await loadTaskPeople()
  const assignee = validAssignee(params.assignee, people)
  const page = await loadBoardTasks(context, workflow, { mine, assignee })
  const records = page.records
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.table, href: '/tasks' }, { label: copy.board }]} />
      <PageContent>
        <PageHeader
          title={copy.board}
          count={page.total}
          description={
            page.total > records.length
              ? `Showing ${String(records.length)} of ${String(page.total)} open and recently finished tasks. Use the Table to find the rest.`
              : undefined
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AssigneeFilter
                value={assignee}
                label={copy.assignee}
                allLabel={copy.anyAssignee}
                options={assigneeOptions(people)}
              />
              <TaskCreateForm />
              <TaskWorkspaceViews active="board" locale={locale} mine={mine} />
            </div>
          }
        />
        <TaskBoard
          stages={toStages(workflow)}
          cards={records.map((task) => toCard(task, { locale, people }))}
          labels={labelsFor(locale)}
        />
      </PageContent>
    </>
  )
}

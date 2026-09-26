import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ChartGantt } from 'lucide-react'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { getRequestContext, workDeps } from '@/server/container'
import type { TaskRecord } from '../../../server/work/task-repository'
import type { TimelineTask } from './save-dates'
import { TimelineChart } from './TimelineChart'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'

const PAGE_TITLE = 'Timeline'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

/** Reads the task repository on every request. */
export const dynamic = 'force-dynamic'

function toTimelineTask({ id, title, startAt, dueAt, updatedAt }: TaskRecord): TimelineTask {
  return { id, title, startAt, dueAt, updatedAt }
}

// The repository reads with the user's access, so the staff scope is already applied.
/** Timeline (spec §17.9). */
export default async function TimelinePage() {
  const context = await getRequestContext()
  const { tasks: repository } = await workDeps(context)
  const [records, locale] = await Promise.all([repository.listTasks(), loadWorkspaceLocale()])
  const tasks = records.filter((task) => task.startAt !== null || task.dueAt !== null).map(toTimelineTask)
  const copy = TASK_COPY[locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.gantt }]} />
      <PageContent>
        {tasks.length > 0 ? (
          <TimelineChart title={copy.gantt} tasks={tasks} locale={locale} />
        ) : (
          <>
            <PageHeader title={copy.gantt} actions={<TaskWorkspaceViews active="gantt" locale={locale} />} />
            <EmptyState
              icon={ChartGantt}
              title={copy.noDatedTasks}
              description={copy.noDatedTasksDescription}
              action={
                <a
                  className="ops-action-button inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
                  href="/tasks"
                >
                  {copy.newTask}
                </a>
              }
            />
          </>
        )}
      </PageContent>
    </>
  )
}

import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ChartGantt } from 'lucide-react'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { getRequestContext } from '@/server/container'
import { loadTimelineTasks } from '../../../server/queries/work/timeline-tasks'
import { TimelineChart } from './TimelineChart'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'

const PAGE_TITLE = 'Timeline'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

/** Reads the scoped tasks on every request. */
export const dynamic = 'force-dynamic'

/** Dated tasks the signed-in user can see, coloured by their stage. */
export default async function TimelinePage() {
  const { rows: tasks, total, locale } = await loadTimelineTasks(await getRequestContext())
  const copy = TASK_COPY[locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.gantt }]} />
      <PageContent>
        {tasks.length > 0 ? (
          <>
            {total > tasks.length ? (
              <p className="mb-2 text-sm text-muted-foreground">
                Showing the {tasks.length} soonest of {total} open tasks that have dates. Use the Table to find the
                rest.
              </p>
            ) : null}
            <TimelineChart title={copy.gantt} tasks={tasks} locale={locale} />
          </>
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

import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ChartGantt } from 'lucide-react'
import type { Metadata } from 'next'
import { getWorkDeps } from '../../../server/work/deps'
import type { TaskRecord } from '../../../server/work/task-repository'
import type { TimelineTask } from './save-dates'
import { TimelineChart } from './TimelineChart'

const PAGE_TITLE = 'Timeline'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

/** Reads the task repository on every request. */
export const dynamic = 'force-dynamic'

function toTimelineTask({ id, title, startAt, dueAt, updatedAt }: TaskRecord): TimelineTask {
  return { id, title, startAt, dueAt, updatedAt }
}

// The repository reads with the user's access, so the staff scope is already applied.
async function datedTasks(): Promise<TimelineTask[]> {
  const { tasks } = await getWorkDeps()
  const records = await tasks.listTasks()
  return records.filter((task) => task.startAt !== null || task.dueAt !== null).map(toTimelineTask)
}

/** Timeline (spec §17.9). */
export default async function TimelinePage() {
  const tasks = await datedTasks()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: PAGE_TITLE }]} />
      <PageContent>
        {tasks.length > 0 ? (
          <TimelineChart title={PAGE_TITLE} tasks={tasks} />
        ) : (
          <>
            <PageHeader title={PAGE_TITLE} />
            <EmptyState
              icon={ChartGantt}
              title="No dated tasks"
              description="Tasks with a start or due date show up here."
            />
          </>
        )}
      </PageContent>
    </>
  )
}

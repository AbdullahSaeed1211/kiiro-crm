import { AppHeader } from '@ops/ui/composites/AppHeader'
import { shellLabels } from '../../../../server/shell-labels'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadTaskView } from '../../../../server/queries/work/task-details'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { ArchiveWorkControl } from '../../archive-work-control'
import { TaskClientField } from './TaskClientField'
import { TimeLog } from './time-log'
import { firstParam, safeReturnTo } from '../../search-params'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Task' }

/** Full-page task detail, using the same content model as the task panel. */
export default async function TaskPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}>) {
  const { id } = await params
  const label = await shellLabels()
  const query = searchParams === undefined ? {} : await searchParams
  const panel = firstParam(query.panel) === '1'
  const returnTo = safeReturnTo(firstParam(query.returnTo), '/tasks')
  const view = await loadTaskView(id)
  if (view === undefined) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('tasks'), href: returnTo }, { label: view.task.title }]} />
      <PageContent>
        <TaskDetailDrawer
          task={view.task}
          options={view.options}
          panel={panel}
          returnTo={returnTo}
          extra={
            <>
              <TaskClientField
                taskId={view.task.id}
                updatedAt={view.task.updatedAt}
                related={view.related}
                editable={view.options.canUpdate}
              />
              <TimeLog taskId={view.task.id} />
              <ArchiveWorkControl type="task" id={view.task.id} label={view.task.title} />
            </>
          }
        />
      </PageContent>
    </>
  )
}

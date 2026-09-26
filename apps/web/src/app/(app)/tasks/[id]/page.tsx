import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadTask, loadTaskPeople } from '../../../../server/queries/work/task-details'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { firstParam, safeReturnTo } from '../../search-params'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Task' }

/** Full-page task detail, using the same content model as the task sheet. */
export default async function TaskPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}>) {
  const { id } = await params
  const query = searchParams === undefined ? {} : await searchParams
  const panel = firstParam(query.panel) === '1'
  const returnTo = safeReturnTo(firstParam(query.returnTo), '/tasks')
  const [task, people] = await Promise.all([loadTask(id), loadTaskPeople()])
  if (task === undefined) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Tasks', href: returnTo }, { label: task.title }]} />
      <PageContent>
        <TaskDetailDrawer
          task={{
            id: task.id,
            title: task.title,
            stage: task.stage,
            priority: task.priority,
            assignees: task.assigneeIds.map((id) => people.get(id) ?? 'Unavailable member'),
            description: task.description,
            startAt: task.startAt,
            dueAt: task.dueAt,
            stageCategory: task.stageCategory,
            updatedAt: task.updatedAt,
          }}
          panel={panel}
          returnTo={returnTo}
        />
      </PageContent>
    </>
  )
}

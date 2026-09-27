import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadTaskView } from '../../../../server/queries/work/task-details'
import { TaskDetailDrawer } from './TaskDetailDrawer'
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
  const query = searchParams === undefined ? {} : await searchParams
  const panel = firstParam(query.panel) === '1'
  const returnTo = safeReturnTo(firstParam(query.returnTo), '/tasks')
  const view = await loadTaskView(id)
  if (view === undefined) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Tasks', href: returnTo }, { label: view.task.title }]} />
      <PageContent>
        <TaskDetailDrawer task={view.task} options={view.options} panel={panel} returnTo={returnTo} />
      </PageContent>
    </>
  )
}

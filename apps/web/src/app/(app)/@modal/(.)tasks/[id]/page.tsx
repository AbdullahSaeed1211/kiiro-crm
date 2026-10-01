import { notFound } from 'next/navigation'
import { loadTaskView } from '../../../../../server/queries/work/task-details'
import { TaskDetailDrawer } from '../../../tasks/[id]/TaskDetailDrawer'
import { firstParam, safeReturnTo } from '../../../search-params'
import { TimeLog } from '../../../tasks/[id]/time-log'

export default async function InterceptedTaskPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const view = await loadTaskView(id)
  if (view === undefined) notFound()
  return (
    <TaskDetailDrawer
      task={view.task}
      options={view.options}
      returnTo={safeReturnTo(firstParam(query.returnTo), '/tasks')}
      restoreFocus
      extra={<TimeLog taskId={view.task.id} />}
    />
  )
}

import { notFound } from 'next/navigation'
import { loadTask, loadTaskPeople } from '../../../../../server/queries/work/task-details'
import { TaskDetailDrawer } from '../../../tasks/[id]/TaskDetailDrawer'

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function safeReturnTo(value: string | undefined): string {
  return value !== undefined && value.startsWith('/') && !value.startsWith('//') ? value : '/tasks'
}

export default async function InterceptedTaskPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const task = await loadTask(id)
  if (task === undefined) notFound()
  const people = await loadTaskPeople(task.assigneeIds)
  return (
    <TaskDetailDrawer
      task={{
        id: task.id,
        title: task.title,
        stage: task.stage,
        priority: task.priority,
        assignees: task.assigneeIds.map((assigneeId) => people.get(assigneeId) ?? 'Unavailable member'),
        description: task.description,
        startAt: task.startAt,
        dueAt: task.dueAt,
        stageCategory: task.stageCategory,
        updatedAt: task.updatedAt,
      }}
      returnTo={safeReturnTo(first(query.returnTo))}
      restoreFocus
    />
  )
}

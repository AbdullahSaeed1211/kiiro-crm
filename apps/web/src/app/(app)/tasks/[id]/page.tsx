import { TaskSheet } from '@ops/ui/composites/TaskSheet'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadTask } from '../../../../server/queries/work/read-models'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Task · Workspace' }

/** Full-page task detail, using the same content model as the task sheet. */
export default async function TaskPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const task = await loadTask(id)
  if (task === undefined) notFound()
  return (
    <main className="min-h-screen bg-background">
      <TaskSheet
        open
        task={{
          id: task.id,
          title: task.title,
          stage: task.stage,
          priority: task.priority,
          assignees: task.assigneeIds,
        }}
        onOpenChange={() => undefined}
      />
    </main>
  )
}

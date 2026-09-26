import { asId } from '@ops/kernel'
import { myTasksBuckets } from '@ops/module-work'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CircleCheckBig } from 'lucide-react'
import type { Metadata } from 'next'
import { loadMyTaskModel } from '../../../server/queries/work/read-models'
import { MyTasksContent } from './MyTasksContent'

export const metadata: Metadata = { title: 'My tasks' }
export const dynamic = 'force-dynamic'

/** Scoped task buckets for the signed-in staff member. */
export default async function MyTasksPage() {
  const model = await loadMyTaskModel()
  const buckets = myTasksBuckets({
    tasks: model.tasks.map((task) => ({
      ...task,
      id: asId(task.id),
      projectId: task.projectId === null ? null : asId(task.projectId),
      stageId: asId(task.stageId),
      assigneeIds: task.assigneeIds.map(asId),
      description: null,
      relatedType: null,
      relatedId: null,
      parentTaskId: null,
      workflowId: asId('work'),
      stageEnteredAt: 0,
      rank: task.id,
      groupId: null,
      startAt: null,
      createdAt: 0,
    })),
    actor: { id: asId(model.actorId) },
    timeZone: model.timeZone,
    now: Date.now(),
  })

  const isEmpty =
    buckets.overdue.length === 0 &&
    buckets.today.length === 0 &&
    buckets.next7Days.length === 0 &&
    buckets.later.length === 0 &&
    buckets.noDueDate.length === 0

  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'My tasks' }]} />
      <PageContent>
        <PageHeader title="My tasks" description="Open work assigned to you." />
        {isEmpty ? (
          <EmptyState
            icon={CircleCheckBig}
            title="Nothing assigned to you"
            description="New work assigned to you will appear here."
          />
        ) : (
          <MyTasksContent buckets={buckets} model={model} />
        )}
      </PageContent>
    </>
  )
}

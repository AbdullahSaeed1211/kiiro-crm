import { asId } from '@ops/kernel'
import { myTasksBuckets } from '@ops/module-work'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CircleCheckBig } from 'lucide-react'
import type { Metadata } from 'next'
import { loadMyTaskModel } from '../../../server/queries/work/my-task-model'
import { catalogFor } from '../../../i18n/locale'
import { MY_TASKS_COPY } from '../../../i18n/my-tasks-copy'
import { MyTasksContent } from './MyTasksContent'

export const metadata: Metadata = { title: 'My tasks' }
export const dynamic = 'force-dynamic'

/** Scoped task buckets for the signed-in staff member. */
export default async function MyTasksPage() {
  const model = await loadMyTaskModel()
  const copy = catalogFor(MY_TASKS_COPY, model.locale)
  const buckets = myTasksBuckets({
    tasks: model.tasks.map((task) => ({
      ...task,
      id: asId(task.id),
      projectId: task.projectId === null ? null : asId(task.projectId),
      stageId: asId(task.stageId),
      assigneeIds: task.assigneeIds.map(asId),
      description: null,
      repeat: 'none' as const,
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
    buckets.noDueDate.length === 0 &&
    model.teamTasks.length === 0

  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader title={copy.title} description={copy.description} />
        {isEmpty ? (
          <EmptyState icon={CircleCheckBig} title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <MyTasksContent buckets={buckets} model={model} />
        )}
      </PageContent>
    </>
  )
}

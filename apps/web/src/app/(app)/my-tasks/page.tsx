import { asId } from '@ops/kernel'
import { myTasksBuckets } from '@ops/module-work'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CircleCheckBig } from 'lucide-react'
import type { Metadata } from 'next'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'

export const metadata: Metadata = { title: 'My tasks · Workspace' }
export const dynamic = 'force-dynamic'

const SECTIONS = [
  ['overdue', 'Overdue'],
  ['today', 'Today'],
  ['next7Days', 'Next 7 days'],
  ['later', 'Later'],
  ['noDueDate', 'No due date'],
] as const

/** Scoped task buckets for the signed-in staff member. */
export default async function MyTasksPage() {
  const model = await loadWorkReadModel()
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
      stageCategory: task.stageCategory,
    })),
    actor: { id: asId(model.actorId) },
    timeZone: model.timeZone,
    now: Date.now(),
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'My tasks' }]} />
      <PageContent>
        <PageHeader title="My tasks" description="Open work assigned to you." />
        <div className="space-y-4">
          {SECTIONS.map(([key, label]) => {
            const rows = buckets[key]
            return (
              <section className="rounded-lg border bg-card" key={key}>
                <header className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="font-medium">{label}</h2>
                  <span className="text-sm text-muted-foreground">{rows.length}</span>
                </header>
                {rows.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-muted-foreground">Nothing here.</div>
                ) : (
                  <ul>
                    {rows.map((task) => (
                      <li className="border-b px-4 py-3 last:border-0" key={task.id}>
                        <a className="font-medium hover:text-primary" href={`/tasks/${task.id}`}>
                          {task.title}
                        </a>
                        <span className="ml-3 text-xs text-muted-foreground">{task.priority}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
        {buckets.overdue.length +
          buckets.today.length +
          buckets.next7Days.length +
          buckets.later.length +
          buckets.noDueDate.length ===
        0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="Nothing assigned to you"
            description="New work assigned to you will appear here."
          />
        ) : null}
      </PageContent>
    </>
  )
}

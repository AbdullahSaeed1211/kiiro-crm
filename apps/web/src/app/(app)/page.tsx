import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { LayoutDashboard } from 'lucide-react'
import type { Metadata } from 'next'
import { loadWorkReadModel } from '../../server/queries/work/read-models'

export const metadata: Metadata = { title: 'Dashboard · Workspace' }
export const dynamic = 'force-dynamic'

function day(value: number | null): string {
  return value === null
    ? 'No due date'
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(value)
}

/** Work dashboard with concise, scoped cards for overdue and upcoming work. */
export default async function DashboardPage() {
  const model = await loadWorkReadModel()
  const open = model.tasks.filter((task) => task.completedAt === null)
  const now = Date.now()
  const overdue = open.filter((task) => task.dueAt !== null && task.dueAt < now)
  const dueWeek = open.filter((task) => task.dueAt !== null && task.dueAt >= now && task.dueAt <= now + 7 * 86_400_000)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Dashboard' }]} />
      <PageContent>
        <PageHeader title="Dashboard" description="A focused view of work that needs attention." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">My overdue</h2>
              <Badge variant="destructive">{overdue.length}</Badge>
            </div>
            {overdue.slice(0, 5).map((task) => (
              <a className="block border-t py-2 text-sm hover:text-primary" key={task.id} href={`/tasks/${task.id}`}>
                {task.title}
                <span className="ml-2 text-xs text-muted-foreground">{day(task.dueAt)}</span>
              </a>
            ))}
            {overdue.length === 0 ? (
              <EmptyState icon={LayoutDashboard} title="Nothing overdue" description="Your open work is on track." />
            ) : null}
          </section>
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Due this week</h2>
              <Badge variant="secondary">{dueWeek.length}</Badge>
            </div>
            {dueWeek.slice(0, 5).map((task) => (
              <a className="block border-t py-2 text-sm hover:text-primary" key={task.id} href={`/tasks/${task.id}`}>
                {task.title}
                <span className="ml-2 text-xs text-muted-foreground">{day(task.dueAt)}</span>
              </a>
            ))}
            {dueWeek.length === 0 ? (
              <EmptyState title="No tasks due" description="There is no open work due in the next seven days." />
            ) : null}
          </section>
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Projects</h2>
              <Badge variant="secondary">{model.projects.length}</Badge>
            </div>
            {model.projects.slice(0, 5).map((project) => (
              <a
                className="block border-t py-2 text-sm hover:text-primary"
                key={project.id}
                href={`/projects/${project.id}`}
              >
                {project.name}
                <span className="ml-2 text-xs text-muted-foreground">{project.stage}</span>
              </a>
            ))}
          </section>
        </div>
      </PageContent>
    </>
  )
}

import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CircleCheckBig } from 'lucide-react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DASHBOARD_COPY } from '../../i18n/config'
import { loadDashboardStats } from '../../server/queries/dashboard'
import { loadWorkReadModel } from '../../server/queries/work/read-models'
import { getRequestContext } from '../../server/work/deps'
import { taskHref } from './task-navigation'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

// eslint-disable-next-line max-params -- date formatting needs the stored value and both user locale settings.
function day(value: number | null, timeZone: string, locale: string): string {
  return value === null
    ? 'No due date'
    : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone }).format(value)
}

function WorkCard({
  title,
  count,
  action,
  children,
}: Readonly<{ title: string; count: number; action?: ReactNode; children: ReactNode }>) {
  return (
    <section className="ops-dashboard-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
      </div>
      {children}
    </section>
  )
}

function StatCard({
  label,
  value,
  detail,
  href,
}: Readonly<{ label: string; value: number; detail: string; href: string }>) {
  return (
    <a
      className="ops-dashboard-card group block p-4 transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </a>
  )
}

/** Work dashboard with concise, scoped cards for overdue and upcoming work. */
// eslint-disable-next-line max-lines-per-function -- the dashboard keeps its stat strip and three action queues together.
export default async function DashboardPage() {
  const context = await getRequestContext()
  const [model, stats] = await Promise.all([loadWorkReadModel(context), loadDashboardStats(context)])
  const copy = DASHBOARD_COPY[model.locale]
  const open = model.tasks.filter((task) => !['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory))
  const mine = open.filter((task) => task.assigneeIds.includes(model.actorId))
  const now = Date.now()
  const overdue = mine.filter((task) => task.dueAt !== null && task.dueAt < now)
  const dueWeek = open.filter((task) => task.dueAt !== null && task.dueAt >= now && task.dueAt <= now + 7 * 86_400_000)
  const activeProjects = model.projects.filter(
    (project) => !['done_success', 'done_failure', 'cancelled'].includes(project.stageCategory),
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          description={copy.description.replace('{mine}', String(mine.length)).replace('{open}', String(open.length))}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
                href="/tasks"
              >
                {copy.newTask}
              </a>
              <a
                className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                href="/leads/new"
              >
                {copy.newLead}
              </a>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={copy.myOpenTasks} value={mine.length} detail={copy.assignedToYou} href="/my-tasks" />
          <StatCard label={copy.openLeads} value={stats.openLeads} detail={copy.needsFollowUp} href="/leads" />
          <StatCard label={copy.openDeals} value={stats.openDeals} detail={copy.activePipeline} href="/deals" />
          <StatCard
            label={copy.contacts}
            value={stats.contacts}
            detail={copy.organizations.replace('{count}', String(stats.organizations))}
            href="/contacts"
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <WorkCard
            title={copy.myOverdue}
            count={overdue.length}
            action={
              <a className="text-xs text-muted-foreground hover:text-foreground hover:underline" href="/my-tasks">
                {copy.viewAll}
              </a>
            }
          >
            {overdue.slice(0, 5).map((task) => (
              <a className="block border-t py-2 text-sm hover:text-primary" key={task.id} href={taskHref(task.id, '/')}>
                {task.title}
                <span className="ml-2 text-xs text-muted-foreground">
                  {day(task.dueAt, model.timeZone, model.locale)}
                </span>
              </a>
            ))}
            {overdue.length === 0 ? (
              <EmptyState icon={CircleCheckBig} title={copy.nothingOverdue} description={copy.onTrack} />
            ) : null}
          </WorkCard>
          <WorkCard
            title={copy.dueThisWeek}
            count={dueWeek.length}
            action={
              <a className="text-xs text-muted-foreground hover:text-foreground hover:underline" href="/tasks">
                {copy.viewAll}
              </a>
            }
          >
            {dueWeek.slice(0, 5).map((task) => (
              <a className="block border-t py-2 text-sm hover:text-primary" key={task.id} href={taskHref(task.id, '/')}>
                {task.title}
                <span className="ml-2 text-xs text-muted-foreground">
                  {day(task.dueAt, model.timeZone, model.locale)}
                </span>
              </a>
            ))}
            {dueWeek.length === 0 ? (
              <EmptyState title={copy.noTasksDue} description={copy.noTasksDueDescription} />
            ) : null}
          </WorkCard>
          <WorkCard
            title={copy.activeProjects}
            count={activeProjects.length}
            action={
              <a className="text-xs text-muted-foreground hover:text-foreground hover:underline" href="/projects">
                {copy.viewAll}
              </a>
            }
          >
            {activeProjects.slice(0, 5).map((project) => (
              <a
                className="block border-t py-2 text-sm hover:text-primary"
                key={project.id}
                href={`/projects/${project.id}`}
              >
                {project.name}
                <span className="ml-2 text-xs text-muted-foreground">{project.stage}</span>
              </a>
            ))}
            {activeProjects.length === 0 ? (
              <EmptyState title={copy.noActiveProjects} description={copy.noActiveProjectsDescription} />
            ) : null}
          </WorkCard>
        </div>
      </PageContent>
    </>
  )
}

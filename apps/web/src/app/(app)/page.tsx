import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { CircleCheckBig } from 'lucide-react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DASHBOARD_COPY } from '../../i18n/config'
import { loadDashboardStats } from '../../server/queries/dashboard'
import { loadDashboardWork } from '../../server/queries/work/dashboard-work'
import { getRequestContext } from '@/server/container'
import { DashboardPipeline } from './dashboard-pipeline'
import { taskHref } from './task-navigation'
import Link from 'next/link'
import { DashboardFollowUps } from './DashboardFollowUps'

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
  viewAll,
  children,
}: Readonly<{ title: string; count: number; viewAll: { href: string; label: string }; children: ReactNode }>) {
  return (
    <section className="ops-dashboard-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          <a className="text-xs text-muted-foreground hover:text-foreground hover:underline" href={viewAll.href}>
            {viewAll.label}
          </a>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
      </div>
      {children}
    </section>
  )
}

function TaskLinks({
  tasks,
  timeZone,
  locale,
}: Readonly<{
  tasks: readonly { id: string; title: string; dueAt: number | null }[]
  timeZone: string
  locale: string
}>) {
  return tasks.map((task) => (
    <Link
      className="block border-t py-2 text-sm hover:text-primary"
      key={task.id}
      href={taskHref(task.id, '/')}
      data-task-link-id={task.id}
    >
      {task.title}
      <span className="ml-2 text-xs text-muted-foreground">{day(task.dueAt, timeZone, locale)}</span>
    </Link>
  ))
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
  const [work, stats] = await Promise.all([loadDashboardWork(context), loadDashboardStats(context)])
  const copy = DASHBOARD_COPY[work.locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          description={copy.description.replace('{mine}', String(work.mine)).replace('{open}', String(work.open))}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
                href="/tasks/new"
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
          <StatCard label={copy.myOpenTasks} value={work.mine} detail={copy.assignedToYou} href="/my-tasks" />
          <StatCard label={copy.openLeads} value={stats.openLeads} detail={copy.needsFollowUp} href="/leads" />
          <StatCard
            label={copy.openDeals}
            value={stats.openDeals}
            detail={copy.activePipeline}
            href="/deals?stage=open"
          />
          <StatCard
            label={copy.contacts}
            value={stats.contacts}
            detail={copy.organizations.replace('{count}', String(stats.organizations))}
            href="/contacts"
          />
        </div>
        {context.actor.role === 'owner' || context.actor.role === 'manager' ? (
          <DashboardPipeline context={context} locale={work.locale} />
        ) : null}
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <DashboardFollowUps locale={work.locale} />
          <WorkCard
            title={copy.myOverdue}
            count={work.overdue.count}
            viewAll={{ href: '/my-tasks', label: copy.viewAll }}
          >
            <TaskLinks tasks={work.overdue.items} timeZone={work.timeZone} locale={work.locale} />
            {work.overdue.count === 0 ? (
              <EmptyState icon={CircleCheckBig} title={copy.nothingOverdue} description={copy.onTrack} />
            ) : null}
          </WorkCard>
          <WorkCard
            title={copy.dueThisWeek}
            count={work.dueWeek.count}
            viewAll={{ href: '/tasks', label: copy.viewAll }}
          >
            <TaskLinks tasks={work.dueWeek.items} timeZone={work.timeZone} locale={work.locale} />
            {work.dueWeek.count === 0 ? (
              <EmptyState title={copy.noTasksDue} description={copy.noTasksDueDescription} />
            ) : null}
          </WorkCard>
          <WorkCard
            title={copy.activeProjects}
            count={work.projects.count}
            viewAll={{ href: '/projects', label: copy.viewAll }}
          >
            {work.projects.items.map((project) => (
              <a
                className="block border-t py-2 text-sm hover:text-primary"
                key={project.id}
                href={`/projects/${project.id}`}
              >
                {project.name}
                <span className="ml-2 text-xs text-muted-foreground">{project.stage}</span>
              </a>
            ))}
            {work.projects.count === 0 ? (
              <EmptyState title={copy.noActiveProjects} description={copy.noActiveProjectsDescription} />
            ) : null}
          </WorkCard>
        </div>
      </PageContent>
    </>
  )
}

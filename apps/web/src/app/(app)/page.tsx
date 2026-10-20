import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { hasDashboardRecords } from '../../server/queries/dashboard'
import { loadDashboardWork, type DashboardWork } from '../../server/queries/work/dashboard-work'
import { getRequestContext, type RequestContext } from '@/server/container'
import { TodayTaskQueue } from './today-work'
import { TodayActions, TodayStart } from './today-start'
import { DashboardFollowUps } from './DashboardFollowUps'

export const metadata: Metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

function TodayContent({ work, context }: Readonly<{ work: DashboardWork; context: RequestContext }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {work.team ? copy.team : copy.mine}. {copy.description}
      </p>
      {work.workEnabled ? <TodayTaskQueue work={work} kind="overdue" /> : null}
      {work.crmEnabled ? <DashboardFollowUps context={context} locale={work.locale} dayStart={work.dayStart} /> : null}
      {work.workEnabled ? <TodayTaskQueue work={work} kind="dueWeek" /> : null}
      <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
        {work.workEnabled ? (
          <Link href="/tasks/repeating" className="underline-offset-4 hover:text-foreground hover:underline">
            {copy.repeating}
          </Link>
        ) : null}
        {work.team ? (
          <Link href="/reports" className="underline-offset-4 hover:text-foreground hover:underline">
            {copy.figures}
          </Link>
        ) : null}
      </nav>
    </>
  )
}

/** Three actionable queues and a single starting point when the workspace has no records. */
export default async function DashboardPage() {
  const context = await getRequestContext()
  const [work, hasRecords] = await Promise.all([loadDashboardWork(context), hasDashboardRecords(context)])
  const firstRun = !hasRecords
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const date = new Intl.DateTimeFormat(work.locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: work.timeZone,
  }).format(Date.now())
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <PageHeader
            title={copy.title}
            description={date}
            actions={firstRun ? undefined : <TodayActions work={work} />}
          />
          {firstRun ? <TodayStart work={work} /> : <TodayContent work={work} context={context} />}
        </div>
      </PageContent>
    </>
  )
}

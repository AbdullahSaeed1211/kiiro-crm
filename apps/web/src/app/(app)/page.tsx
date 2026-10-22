import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { hasDashboardRecords } from '../../server/queries/dashboard'
import { loadDashboardWork, type DashboardWork } from '../../server/queries/work/dashboard-work'
import { getRequestContext, type RequestContext } from '@/server/container'
import { TodayScopeSwitch, TodayTaskQueue } from './today-work'
import { TodayActions, TodayStart, type HomeProfile } from './today-start'
import { DashboardFollowUps } from './DashboardFollowUps'

export const metadata: Metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

function profileTitle(profile: HomeProfile, copy: (typeof DASHBOARD_TODAY_COPY)['en']): string {
  if (profile === 'sales') return copy.salesTitle
  if (profile === 'delivery') return copy.deliveryTitle
  if (profile === 'consultant') return copy.consultantTitle
  return copy.title
}

function profileFocus(profile: HomeProfile, copy: (typeof DASHBOARD_TODAY_COPY)['en']): string {
  if (profile === 'sales') return copy.salesFocus
  if (profile === 'delivery') return copy.deliveryFocus
  if (profile === 'consultant') return copy.consultantFocus
  return copy.adminFocus
}

function todayLinks(profile: HomeProfile, work: DashboardWork): readonly { href: string; label: string }[] {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const links: { href: string; label: string }[] = []
  links.push({ href: '/attendance', label: copy.attendance })
  if (profile === 'sales') links.push({ href: '/sales', label: copy.salesWorkspace })
  if (profile === 'delivery' && work.workEnabled) links.push({ href: '/projects', label: copy.projects })
  if (profile === 'consultant') links.push({ href: '/my-tasks', label: copy.myTasks })
  if (profile !== 'consultant' && work.workEnabled) links.push({ href: '/tasks/repeating', label: copy.repeating })
  if (profile === 'admin') links.push({ href: '/reports', label: copy.figures })
  return links
}

function TodayContent({
  work,
  context,
  profile,
}: Readonly<{ work: DashboardWork; context: RequestContext; profile: HomeProfile }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const showFollowUps = work.crmEnabled && (profile === 'admin' || profile === 'sales')
  const links = todayLinks(profile, work)
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {profileFocus(profile, copy)} {copy.description}
      </p>
      <TodayScopeSwitch work={work} />
      {work.workEnabled ? <TodayTaskQueue work={work} kind="dueToday" /> : null}
      {work.workEnabled && work.overdue.count > 0 ? <TodayTaskQueue work={work} kind="overdue" /> : null}
      {showFollowUps ? (
        <DashboardFollowUps context={context} locale={work.locale} dayStart={work.dayStart} team={work.team} />
      ) : null}
      {work.workEnabled ? <TodayTaskQueue work={work} kind="dueWeek" /> : null}
      <nav aria-label={copy.quickLinks} className="flex flex-wrap gap-5 text-sm text-muted-foreground">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="underline-offset-4 hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

/** Three actionable queues and a single starting point when the workspace has no records. */
export default async function DashboardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly scope?: string }> }>) {
  const [context, params] = await Promise.all([getRequestContext(), searchParams])
  const requestedScope = params.scope === 'mine' || params.scope === 'team' ? params.scope : undefined
  const [work, hasRecords] = await Promise.all([
    loadDashboardWork(context, requestedScope),
    hasDashboardRecords(context),
  ])
  const firstRun = !hasRecords
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const profile: HomeProfile = work.canSeeTeam ? 'admin' : (context.actor.workProfile ?? 'delivery')
  const title = profileTitle(profile, copy)
  const date = new Intl.DateTimeFormat(work.locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: work.timeZone,
  }).format(Date.now())
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <PageHeader
            title={title}
            description={date}
            actions={firstRun ? undefined : <TodayActions work={work} profile={profile} />}
          />
          {firstRun ? (
            <TodayStart work={work} profile={profile} />
          ) : (
            <TodayContent work={work} context={context} profile={profile} />
          )}
        </div>
      </PageContent>
    </>
  )
}

import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { hasDashboardRecords } from '../../server/queries/dashboard'
import { loadDashboardWork, type DashboardWork } from '../../server/queries/work/dashboard-work'
import { getRequestContext, type RequestContext } from '@/server/container'
import { TodayScopeSwitch, TodayOverdueDisclosure } from './today-work'
import { TodayPersonFilter } from './today-person-filter'
import { TodayActions, TodayStart, type HomeProfile } from './today-start'
import { DashboardFollowUps } from './DashboardFollowUps'
import { TodayTaskQuickAdd } from './today-task-quick-add'
import { TodayPlan } from './today-plan'
import { TodayAttendance } from './today-attendance'
import { attendanceDeps } from '@/server/attendance'
import { getWorkspaceSettings } from '@/server/auth/context'
import { todayAsDueAt, DAY_MS } from '@ops/module-work'
import type { AttendanceRecord } from '@ops/module-work'

function isToday(value: number | null | undefined, start: number): boolean {
  return value !== null && value !== undefined && value >= start && value < start + DAY_MS
}

async function loadTodayAttendance(
  context: RequestContext,
  actorId: string,
): Promise<{
  open: AttendanceRecord | null
  checkedOut: AttendanceRecord | null
  timeZone: string
}> {
  const repo = attendanceDeps(context).repo
  const [open, latest, settings] = await Promise.all([repo.open(actorId), repo.latest(actorId), getWorkspaceSettings()])
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const todayStart = todayAsDueAt(Date.now(), timeZone)
  let checkedOut: AttendanceRecord | null = null
  if (latest !== undefined && isToday(latest.reportedCheckOutAt, todayStart)) checkedOut = latest
  return { open: open ?? null, checkedOut, timeZone }
}

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

function todayFocus({
  profile,
  work,
  copy,
}: Readonly<{ profile: HomeProfile; work: DashboardWork; copy: (typeof DASHBOARD_TODAY_COPY)['en'] }>): string {
  return profile === 'admin' && !work.team ? copy.personalFocus : profileFocus(profile, copy)
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

function TodayPrimaryColumn({
  work,
  profile,
  firstRun,
}: Readonly<{ work: DashboardWork; profile: HomeProfile; firstRun: boolean }>) {
  return (
    <div className="grid min-w-0 content-start gap-4">
      {work.workEnabled ? <TodayTaskQuickAdd locale={work.locale} focusPersonalAfterCreate={work.team} /> : null}
      {work.workEnabled ? <TodayPlan work={work} /> : null}
      {firstRun && work.crmEnabled && (profile === 'admin' || profile === 'sales') ? (
        <TodayStart work={work} profile={profile} />
      ) : null}
    </div>
  )
}

function TodaySecondaryColumn({ work, context }: Readonly<{ work: DashboardWork; context: RequestContext }>) {
  return (
    <div className="grid min-w-0 content-start gap-3">
      <h2 className="text-sm font-semibold">{DASHBOARD_TODAY_COPY[work.locale].needsAttention}</h2>
      {work.crmEnabled ? <DashboardFollowUps context={context} work={work} /> : null}
      {work.workEnabled ? <TodayOverdueDisclosure work={work} /> : null}
    </div>
  )
}

function TodayContent({
  work,
  context,
  profile,
  firstRun,
}: Readonly<{ work: DashboardWork; context: RequestContext; profile: HomeProfile; firstRun: boolean }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const links = todayLinks(profile, work)
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {todayFocus({ profile, work, copy })} {copy.description}
      </p>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <TodayPrimaryColumn work={work} profile={profile} firstRun={firstRun} />
        <TodaySecondaryColumn work={work} context={context} />
      </div>
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
}: Readonly<{ searchParams: Promise<{ readonly scope?: string; readonly person?: string }> }>) {
  const [context, params] = await Promise.all([getRequestContext(), searchParams])
  const requestedScope = params.scope === 'mine' || params.scope === 'team' ? params.scope : undefined
  const [work, hasRecords] = await Promise.all([
    loadDashboardWork(context, requestedScope, params.person),
    hasDashboardRecords(context),
  ])
  const attendance = await loadTodayAttendance(context, String(context.actor.id))
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
          <TodayAttendance
            open={attendance.open}
            latest={attendance.checkedOut}
            locale={work.locale}
            timeZone={attendance.timeZone}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TodayScopeSwitch work={work} />
            <TodayPersonFilter work={work} />
          </div>
          <TodayContent work={work} context={context} profile={profile} firstRun={firstRun} />
        </div>
      </PageContent>
    </>
  )
}

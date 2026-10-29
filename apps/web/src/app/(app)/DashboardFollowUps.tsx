import { MessageCircle } from 'lucide-react'
import { DAY_MS } from '@ops/module-work'
import type { RequestContext } from '../../server/container'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { loadTodayLeads } from '../../server/queries/today-leads'
import type { DashboardWork } from '../../server/queries/work/dashboard-work'
import { TodayItem, TodayQueue } from './today-queue'

function followUpLabel(dueAt: number | null, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (dueAt === null) return copy.noDate
  if (dueAt < work.dayStart) return copy.overdue
  if (dueAt < work.dayStart + DAY_MS) return copy.dueToday
  const date = new Intl.DateTimeFormat(work.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dueAt)
  return copy.due.replace('{date}', date)
}

export async function DashboardFollowUps({
  context,
  work,
}: Readonly<{ context: RequestContext; work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const result = await loadTodayLeads(context, work.dayStart, { team: work.team, person: work.personFilter })
  if (result.count === 0) {
    return (
      <p aria-label={copy.waiting} className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
        {copy.waiting}: {work.team ? copy.noTeamWaiting : copy.noWaiting}
      </p>
    )
  }
  return (
    <TodayQueue
      title={copy.waiting}
      count={result.count}
      icon={MessageCircle}
      href={result.personHref}
      viewAll={copy.viewAll}
      empty={work.team ? copy.noTeamWaiting : copy.noWaiting}
      compact
    >
      {result.items.map((lead) => (
        <TodayItem
          key={lead.id}
          title={lead.title}
          detail={[
            lead.company ?? copy.noCompany,
            `${copy.owner}: ${lead.owner ?? copy.unassigned}`,
            `${copy.assignees}: ${lead.people.length > 0 ? lead.people.join(', ') : copy.unassigned}`,
          ].join(' · ')}
          when={followUpLabel(lead.dueAt, work)}
          overdue={lead.dueAt !== null && lead.dueAt < work.dayStart}
          compact
          href={`/leads/${lead.id}`}
          action={copy.followUp}
        />
      ))}
    </TodayQueue>
  )
}

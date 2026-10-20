import { MessageCircle } from 'lucide-react'
import type { RequestContext } from '../../server/container'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { Locale } from '../../i18n/locale'
import { loadTodayLeads } from '../../server/queries/today-leads'
import { TodayItem, TodayQueue } from './today-queue'

export async function DashboardFollowUps({
  context,
  locale,
  dayStart,
}: Readonly<{
  context: RequestContext
  locale: Locale
  dayStart: number
}>) {
  const copy = DASHBOARD_TODAY_COPY[locale]
  const result = await loadTodayLeads(context, dayStart)
  return (
    <TodayQueue
      title={copy.waiting}
      count={result.count}
      icon={MessageCircle}
      href={result.href}
      viewAll={copy.viewAll}
      empty={copy.noWaiting}
    >
      {result.items.map((lead) => (
        <TodayItem
          key={lead.id}
          title={lead.title}
          detail={[lead.company ?? copy.noCompany, lead.owner ?? copy.unassigned].join(' · ')}
          href={`/leads/${lead.id}`}
          action={copy.followUp}
        />
      ))}
    </TodayQueue>
  )
}

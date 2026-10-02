import { EmptyState } from '@ops/ui/composites/EmptyState'
import { groupFollowUps } from '@ops/module-crm'
import Link from 'next/link'
import { catalogFor } from '../../i18n/locale'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { listLeads } from '../../server/crm/leads/queries'

const SHOWN = 5
const READ_LIMIT = 200

/** The signed-in person's leads that are late or due today, or that still wait for a first reply. */
export async function DashboardFollowUps({ locale }: Readonly<{ locale: string }>) {
  const copy = catalogFor(DASHBOARD_TODAY_COPY, locale)
  const result = await listLeads({ owner: 'me', pageSize: READ_LIMIT })
  const groups = groupFollowUps(result.items, {
    day: (item) => item.lead.nextActionAt,
    tiebreak: (item) => item.lead.title,
    now: Date.now(),
  })
  const late = new Set(groups.overdue.map((item) => item.lead.id))
  const due = [...groups.overdue, ...groups.today, ...result.items.filter((item) => item.responseOverdue)]
  const unique = due.filter((item, index) => due.findIndex((other) => other.lead.id === item.lead.id) === index)
  const label = (item: (typeof unique)[number]): string => {
    if (late.has(item.lead.id)) return copy.overdue
    return item.responseOverdue ? copy.noReply : copy.today
  }
  return (
    <section className="ops-dashboard-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{copy.title}</h2>
        <Link
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          href="/leads/follow-ups?owner=me"
        >
          {copy.viewAll}
        </Link>
      </div>
      {unique.slice(0, SHOWN).map((item) => (
        <Link
          key={item.lead.id}
          href={`/leads/${item.lead.id}`}
          className="block border-t py-2 text-sm hover:text-primary"
        >
          {item.lead.title}
          <span className="ml-2 text-xs text-muted-foreground">{label(item)}</span>
        </Link>
      ))}
      {unique.length > SHOWN ? (
        <p className="border-t pt-2 text-xs text-muted-foreground">
          {copy.more.replace('{count}', String(unique.length - SHOWN))}
        </p>
      ) : null}
      {unique.length === 0 ? <EmptyState title={copy.emptyTitle} description={copy.emptyBody} /> : null}
    </section>
  )
}

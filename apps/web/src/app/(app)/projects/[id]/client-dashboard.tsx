import Link from 'next/link'
import type { ClientDashboardCopy } from '../../../../i18n/client-dashboard-copy'
import type { ClientBilling } from '../../../../server/billing/client-summary'
import type { ClientDashboard } from '../../../../server/work/client-dashboard'
import { formatMoney } from '../../billing/money'

const dateOf = (time: number | null, locale: string): string =>
  time === null ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

function Tile({ label, value, alert }: Readonly<{ label: string; value: number | string; alert?: boolean }>) {
  return (
    <section className="ops-dashboard-card px-4 pt-4 pb-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${alert === true ? 'text-destructive' : ''}`}>{value}</p>
    </section>
  )
}

function Areas({
  copy,
  dashboard,
  locale,
  showCollections,
}: Readonly<{ copy: ClientDashboardCopy; dashboard: ClientDashboard; locale: string; showCollections: boolean }>) {
  const rows = dashboard.areas.filter((row) => showCollections || row.area !== 'collections')
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{copy.nothingOpen}</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2">{copy.area}</th>
          <th className="py-2 text-right">{copy.open}</th>
          <th className="py-2 text-right">{copy.overdue}</th>
          <th className="py-2 text-right">{copy.nextDue}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.area} className="border-b">
            <td className="py-2">{copy.areas[row.area] ?? row.area}</td>
            <td className="py-2 text-right tabular-nums">{row.open}</td>
            <td className={`py-2 text-right tabular-nums ${row.overdue > 0 ? 'text-destructive' : ''}`}>
              {row.overdue}
            </td>
            <td className="py-2 text-right text-muted-foreground">{dateOf(row.nextDueAt, locale)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Billing({
  copy,
  billing,
  locale,
}: Readonly<{ copy: ClientDashboardCopy; billing: ClientBilling; locale: string }>) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center justify-between text-sm font-semibold">
        {copy.billing}
        <Link href="/billing" className="text-xs font-normal underline">
          {copy.openBilling}
        </Link>
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={copy.invoicesOpen} value={billing.invoicesSent} />
        <Tile label={copy.invoicesOverdue} value={billing.invoicesOverdue} alert={billing.invoicesOverdue > 0} />
        <Tile label={copy.invoicesPaid} value={billing.invoicesPaid} />
        <Tile label={copy.quotesOut} value={billing.quotesSent} />
      </div>
      <p className="text-sm tabular-nums text-muted-foreground">
        {billing.outstanding
          .map((line) => formatMoney({ minor: line.minor, currency: line.currency, locale }))
          .join(' · ')}
      </p>
    </section>
  )
}

/** One client's dashboard: task counts, work by area, and (for owners and managers) where billing stands. */
export function ClientDashboardView({
  copy,
  dashboard,
  billing,
  locale,
}: Readonly<{
  copy: ClientDashboardCopy
  dashboard: ClientDashboard
  /** Null for people who cannot see billing, or when the project has no company. */
  billing: ClientBilling | null
  locale: string
}>) {
  return (
    <div className="grid max-w-4xl gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={copy.open} value={dashboard.open} />
        <Tile label={copy.overdue} value={dashboard.overdue} alert={dashboard.overdue > 0} />
        <Tile label={copy.dueSoon} value={dashboard.dueSoon} />
        <Tile label={copy.done} value={dashboard.done} />
      </div>
      <Areas copy={copy} dashboard={dashboard} locale={locale} showCollections={billing !== null} />
      {billing === null ? null : <Billing copy={copy} billing={billing} locale={locale} />}
    </div>
  )
}

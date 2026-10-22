import type { ClientDashboardCopy } from '../../../../i18n/client-dashboard-copy'
import type { ClientDashboard } from '../../../../server/work/client-dashboard'

const dateOf = (time: number | null, locale: string): string =>
  time === null ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

function Tile({ label, value, alert }: Readonly<{ label: string; value: number; alert?: boolean }>) {
  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${alert === true ? 'text-destructive' : ''}`}>{value}</dd>
    </div>
  )
}

function Areas({
  copy,
  dashboard,
  locale,
}: Readonly<{ copy: ClientDashboardCopy; dashboard: ClientDashboard; locale: string }>) {
  const rows = dashboard.areas.filter((row) => row.area !== 'collections')
  if (rows.length < 2) return null
  return (
    <div className="min-w-0">
      <ul className="divide-y rounded-lg border bg-card text-sm sm:hidden">
        {rows.map((row) => (
          <li key={row.area} className="min-w-0 px-3 py-2.5">
            <p className="font-medium">{copy.areas[row.area] ?? row.area}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>
                {copy.open}: {row.open}
              </span>
              <span className={row.overdue > 0 ? 'text-destructive' : undefined}>
                {copy.overdue}: {row.overdue}
              </span>
              {row.nextDueAt === null ? null : (
                <span>
                  {copy.nextDue}: {dateOf(row.nextDueAt, locale)}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-sm sm:table">
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
    </div>
  )
}

/** The project summary includes its work only; client-wide billing stays in Billing. */
export function ClientDashboardView({
  copy,
  dashboard,
  locale,
}: Readonly<{
  copy: ClientDashboardCopy
  dashboard: ClientDashboard
  locale: string
}>) {
  return (
    <div className="grid w-full min-w-0 max-w-4xl grid-cols-1 gap-5">
      <dl className="grid grid-cols-2 divide-x divide-y rounded-lg border bg-card sm:grid-cols-4 sm:divide-y-0">
        <Tile label={copy.open} value={dashboard.open} />
        <Tile label={copy.overdue} value={dashboard.overdue} alert={dashboard.overdue > 0} />
        <Tile label={copy.dueSoon} value={dashboard.dueSoon} />
        <Tile label={copy.done} value={dashboard.done} />
      </dl>
      <Areas copy={copy} dashboard={dashboard} locale={locale} />
    </div>
  )
}

import type { RequestContext } from '../../../server/container'
import { formatDuration } from '../../../server/time/duration'
import { loadTimeReport, type TimeTotal } from '../../../server/time/report'

const DAY_MS = 86_400_000

function Table({ title, rows }: Readonly<{ title: string; rows: readonly TimeTotal[] }>) {
  return (
    <div className="min-w-0 overflow-x-auto" role="region" aria-label={title} tabIndex={0}>
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">{title}</th>
            <th className="px-4 py-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t">
              <th scope="row" className="px-4 py-2 text-left font-medium">
                {row.name}
              </th>
              <td className="px-4 py-2 text-right tabular-nums">{formatDuration(row.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Time logged in the report's date range, by person and by project. */
export async function TimeReport({
  context,
  fromDate,
  toDate,
}: Readonly<{ context: RequestContext; fromDate: string; toDate: string }>) {
  const fromMs = Date.parse(`${fromDate}T00:00:00.000Z`)
  const report = await loadTimeReport(context, { fromMs, toMs: Date.parse(`${toDate}T00:00:00.000Z`) + DAY_MS - 1 })
  return (
    <section className="ops-surface-card overflow-hidden rounded-lg border bg-card">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Time logged</h2>
        <span className="flex items-baseline gap-3 text-sm text-muted-foreground">
          <a className="underline" href={`/api/v1/export/time?from=${fromDate}&to=${toDate}`} download>
            Download CSV
          </a>
          <span className="tabular-nums">{formatDuration(report.total)}</span>
        </span>
      </header>
      {report.total === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No time was logged in this range. People log time from a task.
        </p>
      ) : (
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Table title="By person" rows={report.byPerson} />
          <Table title="By project" rows={report.byProject} />
        </div>
      )}
    </section>
  )
}

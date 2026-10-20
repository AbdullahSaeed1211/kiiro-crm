import { formatDuration } from '../../../server/time/duration'
import type { TimeReport, TimeTotal } from '../../../server/time/report'

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
            <tr key={row.id} className="border-t">
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
export function TimeReport({
  report,
  fromDate,
  toDate,
  copy,
}: Readonly<{
  report: TimeReport
  fromDate: string
  toDate: string
  copy: Readonly<{
    timeLogged: string
    byPerson: string
    byProject: string
    noTime: string
    logFromTask: string
    download: string
  }>
}>) {
  return (
    <section className="ops-surface-card overflow-hidden rounded-lg border bg-card">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{copy.timeLogged}</h2>
        <span className="flex items-baseline gap-3 text-sm text-muted-foreground">
          <a className="underline" href={`/api/v1/export/time?from=${fromDate}&to=${toDate}`} download>
            {copy.download}
          </a>
          <span className="tabular-nums">{formatDuration(report.total)}</span>
        </span>
      </header>
      {report.total === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {copy.noTime} {copy.logFromTask}
        </p>
      ) : (
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Table title={copy.byPerson} rows={report.byPerson} />
          <Table title={copy.byProject} rows={report.byProject} />
        </div>
      )}
    </section>
  )
}

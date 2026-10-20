import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import type { ReportFigures } from '../../../server/queries/reports'
import type { RetainerFigure } from '../../../server/queries/report-retainers'
import type { TimeReport } from '../../../server/time/report'
import type { ReactNode } from 'react'

export interface ReportChartCopy {
  readonly leadsBySource: string
  readonly workload: string
  readonly openTasksDue: string
  readonly timeLogged: string
  readonly retainers: string
  readonly recurringTasks: string
  readonly recurringDue: string
  readonly recurringOverdue: string
  readonly recurringUnassigned: string
  readonly trackedTime: string
  readonly budgetNotRecorded: string
  readonly noLeadSources: string
  readonly noWorkload: string
  readonly noRetainers: string
  readonly unspecified: string
  readonly noTimeLogged: string
  readonly unknownSource: string
}

function ChartCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  )
}

function HorizontalBar({ percent, className = 'bg-primary' }: Readonly<{ percent: number; className?: string }>) {
  return (
    <div className="h-2 rounded-full bg-muted" aria-hidden>
      <div className={`h-2 rounded-full ${className}`} style={{ width: `${String(percent)}%` }} />
    </div>
  )
}

function SourceChart({
  sources,
  formatCount,
  labels,
}: Readonly<{
  sources: ReportFigures['leadSources']
  formatCount: (value: number) => string
  labels: ReportChartCopy
}>) {
  const max = Math.max(1, ...sources.map((source) => source.count))
  if (sources.length === 0) return <p className="text-sm text-muted-foreground">{labels.noLeadSources}</p>
  return (
    <>
      {sources.map((source) => (
        <div key={source.id} className="grid gap-1 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">
              {source.name ?? (source.id === '__unspecified__' ? labels.unspecified : labels.unknownSource)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{formatCount(source.count)}</span>
          </div>
          <HorizontalBar percent={(source.count / max) * 100} />
        </div>
      ))}
    </>
  )
}

function WorkloadChart({
  owners,
  time,
  formatCount,
  formatTime,
  labels,
}: Readonly<{
  owners: ReportFigures['owners']
  time: TimeReport
  formatCount: (value: number) => string
  formatTime: (minutes: number) => string
  labels: ReportChartCopy
}>) {
  const minutesByPerson = new Map(time.byPerson.map((person) => [person.id, person.minutes]))
  const people = new Map<string, { name: string; openTasks: number; minutes: number }>()
  for (const owner of owners) {
    const id = owner.id ?? '__unassigned__'
    people.set(id, {
      name: owner.id === null ? labels.unspecified : owner.name,
      openTasks: owner.openTasks,
      minutes: minutesByPerson.get(id) ?? 0,
    })
  }
  for (const person of time.byPerson) {
    const row = people.get(person.id) ?? { name: person.name, openTasks: 0, minutes: 0 }
    row.minutes = person.minutes
    people.set(person.id, row)
  }
  const rows = [...people]
    .filter(([, values]) => values.openTasks > 0 || values.minutes > 0)
    .toSorted(
      (a, b) => b[1].openTasks - a[1].openTasks || b[1].minutes - a[1].minutes || a[1].name.localeCompare(b[1].name),
    )
  const maxTasks = Math.max(1, ...rows.map(([, values]) => values.openTasks))
  const maxMinutes = Math.max(1, ...rows.map(([, values]) => values.minutes))
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{labels.noWorkload}</p>
  return (
    <>
      {rows.map(([id, values]) => (
        <div key={id} className="grid gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">{values.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatCount(values.openTasks)} {labels.openTasksDue} · {formatTime(values.minutes)} {labels.timeLogged}
            </span>
          </div>
          <div className="grid gap-1">
            <HorizontalBar percent={(values.openTasks / maxTasks) * 100} />
            <HorizontalBar percent={(values.minutes / maxMinutes) * 100} className="bg-[var(--stage-blue)]" />
          </div>
        </div>
      ))}
    </>
  )
}

function RetainerChart({
  retainers,
  formatCount,
  formatTime,
  labels,
}: Readonly<{
  retainers: readonly RetainerFigure[]
  formatCount: (value: number) => string
  formatTime: (minutes: number) => string
  labels: ReportChartCopy
}>) {
  if (retainers.length === 0) return <p className="text-sm text-muted-foreground">{labels.noRetainers}</p>
  return (
    <>
      <p className="text-xs text-muted-foreground">{labels.budgetNotRecorded}</p>
      {retainers.map((retainer) => (
        <div
          key={retainer.id}
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-2 text-sm"
        >
          <span className="min-w-0 truncate font-medium">{retainer.name}</span>
          <div className="grid gap-1 text-right tabular-nums text-muted-foreground">
            <span>
              {formatCount(retainer.recurringTasks)} {labels.recurringTasks} · {formatCount(retainer.recurringDue)}{' '}
              {labels.recurringDue}
            </span>
            <span>
              {formatCount(retainer.recurringOverdue)} {labels.recurringOverdue} ·{' '}
              {formatCount(retainer.recurringUnassigned)} {labels.recurringUnassigned}
            </span>
            <span>
              {retainer.loggedEntries === 0 ? labels.noTimeLogged : formatTime(retainer.loggedMinutes)}{' '}
              {labels.trackedTime}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

/** Date-range charts based on leads created, task due dates, logged time and explicit retainer project flags. */
export function ReportCharts({
  figures,
  time,
  retainers,
  formatCount,
  formatTime,
  labels,
}: Readonly<{
  figures: ReportFigures
  time: TimeReport
  retainers: readonly RetainerFigure[]
  formatCount: (value: number) => string
  formatTime: (minutes: number) => string
  labels: ReportChartCopy
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={labels.leadsBySource}>
        <SourceChart sources={figures.leadSources} formatCount={formatCount} labels={labels} />
      </ChartCard>
      <ChartCard title={labels.workload}>
        <WorkloadChart
          owners={figures.owners}
          time={time}
          formatCount={formatCount}
          formatTime={formatTime}
          labels={labels}
        />
      </ChartCard>
      <ChartCard title={labels.retainers}>
        <RetainerChart retainers={retainers} formatCount={formatCount} formatTime={formatTime} labels={labels} />
      </ChartCard>
    </div>
  )
}

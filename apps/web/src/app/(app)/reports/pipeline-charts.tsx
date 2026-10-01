import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import type { PipelineSummary, StageTotal } from '@ops/module-crm'
import type { ReactNode } from 'react'

const STAGE_COLORS = new Set(['gray', 'blue', 'green', 'amber', 'red', 'violet', 'teal', 'pink'])
const MIN_BAR_PERCENT = 2

const colorVar = (color: string): string => `var(--stage-${STAGE_COLORS.has(color) ? color : 'gray'})`

interface Formatters {
  readonly money: (minor: number) => string
  readonly count: (value: number) => string
  /** A `YYYY-MM` key as a short month and year, for example `Apr 26`. */
  readonly month: (key: string) => string
}

function Bar({ percent, color }: Readonly<{ percent: number; color: string }>) {
  return (
    <div className="h-2 rounded-full bg-muted" aria-hidden>
      <div
        className="h-2 rounded-full"
        style={{ width: `${String(Math.max(percent, MIN_BAR_PERCENT))}%`, backgroundColor: color }}
      />
    </div>
  )
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

export function StageBars({
  stages,
  detail,
}: Readonly<{ stages: readonly StageTotal[]; detail: (stage: StageTotal) => string }>) {
  const max = Math.max(1, ...stages.map((stage) => stage.valueMinor || stage.count))
  return stages.map((stage) => (
    <div key={stage.name} className="grid gap-1 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{stage.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{detail(stage)}</span>
      </div>
      <Bar percent={((stage.valueMinor || stage.count) / max) * 100} color={colorVar(stage.color)} />
    </div>
  ))
}

function WonByMonth({ summary, format }: Readonly<{ summary: PipelineSummary; format: Formatters }>) {
  const max = Math.max(1, ...summary.wonByMonth.map((month) => month.valueMinor))
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Revenue won per month">
      {summary.wonByMonth.map((month) => (
        <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 text-center text-xs">
          <span className="truncate tabular-nums text-muted-foreground">
            {month.valueMinor === 0 ? '' : format.money(month.valueMinor)}
          </span>
          <div
            className="rounded-t bg-[var(--stage-green)]"
            style={{
              height: `${String(Math.max((month.valueMinor / max) * 100, month.valueMinor === 0 ? 1 : MIN_BAR_PERCENT))}%`,
            }}
          />
          <span className="text-muted-foreground">{format.month(month.month)}</span>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}

/** The pipeline at a glance: headline numbers, deals and leads by stage, revenue won per month and where leads come from. */
export function PipelineCharts({ summary, format }: Readonly<{ summary: PipelineSummary; format: Formatters }>) {
  const open = summary.dealStages.filter((stage) => !stage.category.startsWith('done'))
  const won = summary.wonByMonth.reduce((sum, month) => sum + month.valueMinor, 0)
  const rate = summary.winRate === null ? '—' : `${String(Math.round(summary.winRate * 100))}%`
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Open pipeline, all deals"
          value={format.money(open.reduce((sum, stage) => sum + stage.valueMinor, 0))}
        />
        <Kpi label="Won, last 6 months" value={format.money(won)} />
        <Kpi label="Win rate, all closed deals" value={rate} />
        <Kpi label="Open deals" value={format.count(open.reduce((sum, stage) => sum + stage.count, 0))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Deals by stage">
          <StageBars
            stages={summary.dealStages}
            detail={(stage) => `${format.count(stage.count)} · ${format.money(stage.valueMinor)}`}
          />
        </ChartCard>
        <ChartCard title="Revenue won per month">
          <WonByMonth summary={summary} format={format} />
        </ChartCard>
        <ChartCard title="Leads by stage">
          <StageBars stages={summary.leadStages} detail={(stage) => format.count(stage.count)} />
        </ChartCard>
        <ChartCard title="Where leads come from">
          {summary.leadSources.map((source) => (
            <div key={source.name} className="grid gap-1 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{source.name}</span>
                <span className="tabular-nums text-muted-foreground">{format.count(source.count)}</span>
              </div>
              <Bar
                percent={(source.count / Math.max(1, summary.leadSources[0]?.count ?? 1)) * 100}
                color="var(--primary)"
              />
            </div>
          ))}
        </ChartCard>
      </div>
    </div>
  )
}

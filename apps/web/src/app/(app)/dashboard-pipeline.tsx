import { DASHBOARD_COPY, type Locale } from '../../i18n/config'
import type { RequestContext } from '../../server/container'
import { loadPipelineSummary } from '../../server/queries/pipeline-insights'
import { StageBars } from './reports/pipeline-charts'

/** Open deals by stage with the headline numbers, for owners and managers; links to the full figures. */
export async function DashboardPipeline({ context, locale }: Readonly<{ context: RequestContext; locale: Locale }>) {
  const copy = DASHBOARD_COPY[locale]
  const summary = await loadPipelineSummary(context)
  const open = summary.dealStages.filter((stage) => !stage.category.startsWith('done'))
  const money = (minor: number): string =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: summary.currency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(minor / 100)
  const value = open.reduce((sum, stage) => sum + stage.valueMinor, 0)
  const rate = summary.winRate === null ? '—' : `${String(Math.round(summary.winRate * 100))}%`
  return (
    <section className="ops-dashboard-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{copy.salesPipeline}</h2>
        <a className="text-xs text-muted-foreground hover:text-foreground hover:underline" href="/reports">
          {copy.figures} →
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.openPipelineValue}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{money(value)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{copy.winRate}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{rate}</dd>
          </div>
        </dl>
        <div className="grid gap-3">
          <StageBars stages={open} detail={(stage) => `${String(stage.count)} · ${money(stage.valueMinor)}`} />
        </div>
      </div>
    </section>
  )
}

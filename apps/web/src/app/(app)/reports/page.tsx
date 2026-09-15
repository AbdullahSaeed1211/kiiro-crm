import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { REPORT_COPY } from '../../../i18n/config'
import { loadReportFigures } from '../../../server/queries/reports'
import { getRequestContext } from '../../../server/work/deps'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Figures' }

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function number(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

function money({
  amountMinor,
  currency,
  locale,
  mixedLabel,
}: Readonly<{ amountMinor: number; currency: string | null; locale: string; mixedLabel: string }>): string {
  if (amountMinor === 0) return '—'
  if (currency === null) return mixedLabel
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100)
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <section className="ops-dashboard-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </section>
  )
}

/** Owner/manager reporting surface with bounded, URL-addressable date ranges. */
// eslint-disable-next-line max-lines-per-function -- the figures page keeps range controls, metrics, and one responsive table together.
export default async function ReportsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const query = await searchParams
  const figures = await loadReportFigures(
    { range: first(query.range), from: first(query.from), to: first(query.to) },
    context,
  )
  const copy = REPORT_COPY[figures.locale]
  const locale = figures.locale === 'es' ? 'es-ES' : 'en-US'
  const range = figures.range
  const options = [
    ['7d', copy.last7],
    ['30d', copy.last30],
    ['90d', copy.last90],
    ['ytd', copy.ytd],
    ['custom', copy.custom],
  ] as const
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          description={copy.description}
          actions={
            <a
              className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
              href="/"
            >
              {copy.backToDashboard}
            </a>
          }
        />
        <form method="get" className="ops-surface-card flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
          <label className="grid gap-1 text-xs font-medium">
            <span>{copy.range}</span>
            <select name="range" defaultValue={range.key} className="h-9 min-w-40 rounded-md border bg-background px-2 text-sm">
              {options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            <span>{copy.from}</span>
            <input name="from" type="date" defaultValue={range.fromDate} className="h-9 rounded-md border bg-background px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            <span>{copy.to}</span>
            <input name="to" type="date" defaultValue={range.toDate} className="h-9 rounded-md border bg-background px-2 text-sm" />
          </label>
          <button type="submit" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {copy.apply}
          </button>
          <output className="text-xs text-muted-foreground" aria-live="polite">
            {range.fromDate} – {range.toDate}
          </output>
        </form>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label={copy.openTasks} value={number(figures.totals.openTasks, locale)} />
          <Metric label={copy.completedTasks} value={number(figures.totals.completedTasks, locale)} />
          <Metric label={copy.overdueTasks} value={number(figures.totals.overdueTasks, locale)} />
          <Metric label={copy.pipeline} value={money({ amountMinor: figures.totals.pipelineMinor, currency: figures.totals.pipelineCurrency, locale, mixedLabel: copy.mixedCurrency })} />
          <Metric label={copy.leads} value={number(figures.totals.leads, locale)} />
          <Metric label={copy.deals} value={number(figures.totals.deals, locale)} />
          <Metric label={copy.wonDeals} value={number(figures.totals.wonDeals, locale)} />
        </div>
        <section className="ops-surface-card overflow-hidden rounded-lg border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{copy.ownerBreakdown}</h2>
          </header>
          {figures.owners.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{copy.noOwners}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[48rem] w-full text-sm">
                <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{copy.owner}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.openTasks}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.completedTasks}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.overdueTasks}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.leads}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.deals}</th>
                    <th className="px-4 py-2 text-right font-medium">{copy.pipeline}</th>
                  </tr>
                </thead>
                <tbody>
                  {figures.owners.map((owner) => (
                    <tr key={owner.id ?? 'unassigned'} className="border-t">
                      <th scope="row" className="px-4 py-3 text-left font-medium">{owner.id === null ? copy.unassigned : owner.name}</th>
                      <td className="px-4 py-3 text-right tabular-nums">{number(owner.openTasks, locale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{number(owner.completedTasks, locale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{number(owner.overdueTasks, locale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{number(owner.leads, locale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{number(owner.deals, locale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money({ amountMinor: owner.pipelineMinor, currency: owner.pipelineCurrency, locale, mixedLabel: copy.mixedCurrency })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </PageContent>
    </>
  )
}

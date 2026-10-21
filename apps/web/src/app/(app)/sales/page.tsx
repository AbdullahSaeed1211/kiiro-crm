import Link from 'next/link'
import type { Metadata } from 'next'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { formatDate } from '../../../i18n/format'
import { SALES_COPY } from '../../../i18n/sales-copy'
import { loadSalesWorkspace } from '../../../server/queries/crm/sales-workspace'
import { QuickSchedule } from './quick-schedule'
import { taskHref } from '../task-navigation'
import { formatYearMonth } from '@ops/ui/lib/dates'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sales desk' }

type Workspace = Awaited<ReturnType<typeof loadSalesWorkspace>>
type SalesCopy = (typeof SALES_COPY)[keyof typeof SALES_COPY]

function scheduleEditHref(item: Workspace['schedule'][number], timeZone: string): string | undefined {
  if (item.id.startsWith('legacy-')) return undefined
  const { year, month } = formatYearMonth(item.startsAt, timeZone)
  return `/calendar?${new URLSearchParams({ year, month, event: item.id }).toString()}`
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ScheduleTime({
  at,
  timeZone,
  locale,
  overdue,
  overdueLabel,
}: Readonly<{ at: number; timeZone: string; locale: string; overdue: boolean; overdueLabel: string }>) {
  return (
    <time
      dateTime={new Date(at).toISOString()}
      className={overdue ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}
    >
      {formatDate(at, locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone,
      })}
      {overdue ? ` · ${overdueLabel}` : ''}
    </time>
  )
}

function DueDate({ at, locale, now }: Readonly<{ at: number; locale: string; now: number }>) {
  const today = new Date(now)
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return (
    <time
      dateTime={new Date(at).toISOString()}
      className={at < todayUtc ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}
    >
      {formatDate(at, locale, { dateStyle: 'medium', timeZone: 'UTC' })}
    </time>
  )
}

function SalesActions({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/calendar">
        {copy.calendar}
      </Link>
      {model.manager ? (
        <>
          <Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/sales">
            {copy.mine}
          </Link>
          <Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/sales?view=team">
            {copy.team}
          </Link>
        </>
      ) : null}
    </div>
  )
}

function ScheduleSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  const schedule = model.schedule.slice(0, 16)
  return (
    <Section title={copy.schedule}>
      <QuickSchedule
        leads={model.leads.map((lead) => ({ id: lead.id, title: lead.title }))}
        timeZone={model.timeZone}
        copy={copy}
      />
      {schedule.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.emptySchedule}</p>
      ) : (
        <ul className="grid divide-y">
          {schedule.map((item) => {
            const editHref = scheduleEditHref(item, model.timeZone)
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link className="min-w-0 font-medium hover:underline" href={`/${item.recordType}s/${item.recordId}`}>
                  <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {item.kind === 'callback' ? copy.callback : copy.appointment}
                  </span>
                  {item.title}
                </Link>
                <ScheduleTime
                  at={item.startsAt}
                  timeZone={model.timeZone}
                  locale={model.locale}
                  overdue={item.startsAt < model.now}
                  overdueLabel={copy.overdue}
                />
                {editHref === undefined ? null : (
                  <Link className="text-sm text-primary underline-offset-4 hover:underline" href={editHref}>
                    {copy.editSchedule}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function LeadsSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <Section title={copy.assignedLeads}>
      {model.leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.emptyLeads}</p>
      ) : (
        <ul className="grid divide-y">
          {model.leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 py-2">
              <Link className="font-medium hover:underline" href={`/leads/${lead.id}`}>
                {lead.title}
              </Link>
              {lead.nextActionAt === null ? null : (
                <ScheduleTime
                  at={lead.nextActionAt}
                  timeZone={model.timeZone}
                  locale={model.locale}
                  overdue={lead.nextActionAt < model.now}
                  overdueLabel={copy.overdue}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {model.moreLeads ? (
        <Link className="text-sm font-medium text-primary hover:underline" href="/leads">
          {copy.viewAll}
        </Link>
      ) : null}
    </Section>
  )
}

function CallsSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <Section title={copy.calls}>
      {model.calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.emptyCalls}</p>
      ) : (
        <ul className="grid divide-y">
          {model.calls.map((call) => (
            <li key={call.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link className="font-medium hover:underline" href={`/${call.recordType}s/${call.recordId}`}>
                {call.title}
              </Link>
              <span className="text-right text-muted-foreground">
                {copy[call.outcome]} ·{' '}
                {formatDate(call.occurredAt, model.locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: model.timeZone,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function TasksSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <Section title={copy.tasks}>
      {model.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.emptyTasks}</p>
      ) : (
        <ul className="grid divide-y">
          {model.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-2">
              <Link className="font-medium hover:underline" href={taskHref(task.id, '/sales')}>
                {task.title}
              </Link>
              {task.dueAt === null ? null : <DueDate at={task.dueAt} locale={model.locale} now={model.now} />}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function SalesQueues({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="grid content-start gap-4">
        <ScheduleSection model={model} copy={copy} />
        <LeadsSection model={model} copy={copy} />
      </div>
      <div className="grid content-start gap-4">
        <CallsSection model={model} copy={copy} />
        <TasksSection model={model} copy={copy} />
      </div>
    </div>
  )
}

/** A personal sales queue plus an explicit team view for managers. */
export default async function SalesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly view?: string }> }>) {
  const query = await searchParams
  const model = await loadSalesWorkspace({ team: query.view === 'team' })
  const copy = SALES_COPY[model.locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          description={copy.description}
          actions={<SalesActions model={model} copy={copy} />}
        />
        <SalesQueues model={model} copy={copy} />
      </PageContent>
    </>
  )
}

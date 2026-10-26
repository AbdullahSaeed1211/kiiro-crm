import Link from 'next/link'
import type { Metadata } from 'next'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { SALES_COPY } from '../../../i18n/sales-copy'
import { formatDate } from '../../../i18n/format'
import { loadSalesWorkspace } from '../../../server/queries/crm/sales-workspace'
import { QuickSchedule } from './quick-schedule'
import { taskHref } from '../task-navigation'
import { formatYearMonth } from '@ops/ui/lib/dates'
import { LoadFailure } from '../load-failure'
import { SalesSection } from './sales-section'
import { SalesActions } from './sales-actions'
import { DueDate, ScheduleTime } from './sales-time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sales desk' }

type Workspace = Awaited<ReturnType<typeof loadSalesWorkspace>>
type SalesCopy = (typeof SALES_COPY)[keyof typeof SALES_COPY]

function scheduleEditHref(input: {
  item: Workspace['schedule'][number]
  timeZone: string
  team: boolean
}): string | undefined {
  const { item, timeZone, team } = input
  if (item.id.startsWith('legacy-')) return undefined
  const { year, month } = formatYearMonth(item.startsAt, timeZone)
  return `/calendar?${new URLSearchParams({ year, month, event: item.id, ...(team ? { view: 'team' } : {}) }).toString()}`
}

function ScheduleSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  const schedule = [...model.schedule]
    .sort((left, right) => {
      const leftPast = left.startsAt < model.now
      const rightPast = right.startsAt < model.now
      if (leftPast !== rightPast) return leftPast ? 1 : -1
      return leftPast ? right.startsAt - left.startsAt : left.startsAt - right.startsAt
    })
    .slice(0, 16)
  return (
    <SalesSection title={model.team ? copy.teamSchedule : copy.schedule}>
      <QuickSchedule
        leads={model.leads.map((lead) => ({ id: lead.id, title: lead.title }))}
        timeZone={model.timeZone}
        copy={copy}
      />
      {schedule.length === 0 ? (
        <p className="text-sm text-muted-foreground">{model.team ? copy.emptyTeamSchedule : copy.emptySchedule}</p>
      ) : (
        <ul className="grid divide-y">
          {schedule.map((item) => {
            const editHref = scheduleEditHref({ item, timeZone: model.timeZone, team: model.team })
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link className="min-w-0 font-medium hover:underline" href={`/${item.recordType}s/${item.recordId}`}>
                  <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {item.kind === 'callback' ? copy.callback : copy.appointment}
                  </span>
                  {item.title}
                </Link>
                {model.team && item.assigneeIds.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.assignees}:{' '}
                    {item.assigneeIds.map((id) => model.people[String(id)] ?? copy.unassigned).join(', ')}
                  </p>
                ) : null}
                {model.team && item.assigneeIds.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.assignees}: {copy.unassigned}
                  </p>
                ) : null}
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
    </SalesSection>
  )
}

function LeadsSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <SalesSection title={model.team ? copy.teamLeads : copy.assignedLeads}>
      {model.leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{model.team ? copy.emptyTeamLeads : copy.emptyLeads}</p>
      ) : (
        <ul className="grid divide-y">
          {model.leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <Link className="font-medium hover:underline" href={`/leads/${lead.id}`}>
                  {lead.title}
                </Link>
                {model.team ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.owner}:{' '}
                    {lead.ownerId === null ? copy.unassigned : (model.people[lead.ownerId] ?? copy.unassigned)}
                    {' · '}
                    {copy.assignees}:{' '}
                    {lead.assigneeIds.length === 0
                      ? copy.unassigned
                      : lead.assigneeIds.map((id) => model.people[id] ?? copy.unassigned).join(', ')}
                  </p>
                ) : null}
              </div>
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
    </SalesSection>
  )
}

function CallsSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <SalesSection title={model.team ? copy.teamCalls : copy.calls}>
      {model.calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">{model.team ? copy.emptyTeamCalls : copy.emptyCalls}</p>
      ) : (
        <ul className="grid divide-y">
          {model.calls.map((call) => (
            <li key={call.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link className="font-medium hover:underline" href={`/${call.recordType}s/${call.recordId}`}>
                {call.title}
              </Link>
              <span className="text-right text-muted-foreground">
                {model.team ? `${copy.recordedBy}: ${model.people[String(call.callerId)] ?? copy.unassigned} · ` : ''}
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
    </SalesSection>
  )
}

function TasksSection({ model, copy }: Readonly<{ model: Workspace; copy: SalesCopy }>) {
  return (
    <SalesSection title={model.team ? copy.teamTasks : copy.tasks}>
      {model.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{model.team ? copy.emptyTeamTasks : copy.emptyTasks}</p>
      ) : (
        <ul className="grid divide-y">
          {model.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <Link className="font-medium hover:underline" href={taskHref(task.id, '/sales')}>
                  {task.title}
                </Link>
                {model.team ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.assignees}:{' '}
                    {task.assigneeIds.length === 0
                      ? copy.unassigned
                      : task.assigneeIds.map((id) => model.people[id] ?? copy.unassigned).join(', ')}
                  </p>
                ) : null}
              </div>
              {task.dueAt === null ? null : <DueDate at={task.dueAt} locale={model.locale} now={model.now} />}
            </li>
          ))}
        </ul>
      )}
    </SalesSection>
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
          description={model.team ? copy.teamDescription : copy.description}
          actions={<SalesActions model={model} copy={{ calendar: copy.calendar, mine: copy.mine, team: copy.team }} />}
        />
        {model.loadError ? <LoadFailure title={copy.title} /> : <SalesQueues model={model} copy={copy} />}
      </PageContent>
    </>
  )
}

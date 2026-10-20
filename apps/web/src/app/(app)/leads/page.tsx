import { TABLE_LABELS } from '../../../i18n/table-labels'
import { LIST_COPY, type ListCopy } from '../../../i18n/list-copy'
import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import { initials } from '@ops/ui/lib/initials'
import { PersonCell } from '../person-cell'
import { ExportLink, ImportLink } from '../ExportLink'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyValue, paginationFor, type DataTableColumn, type DataTableRow } from '@ops/ui/composites/DataTable'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { leadViews } from './lead-views'
import { StageDot } from '@ops/ui/composites/StagePill'
import type { Metadata } from 'next'
import { listLeads, parseLeadSearch, parseLeadStages } from '../../../server/crm/leads/queries'
import { getProductContext } from '../../../server/auth/context'
import { formatDate } from '../../../i18n/format'
import { listSavedViews } from '../../../server/queries/settings/listSavedViews'
import { assignLeadsAction, moveLeadsAction } from '../../../server/crm/leads/actions'
import { BulkTable } from '../BulkTable'
import { LeadListControls } from './LeadListControls'
import { LeadFilterChips } from './LeadFilterChips'
import { LeadViewControls, type LeadViewLink } from './LeadViewControls'
import { LeadCreateDialogClient } from '../quick-create/LeadCreateDialogClient'
import { ListEmpty } from '../ListEmpty'

type SearchParams = Record<string, string | string[] | undefined>
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Leads' }
import { SECTION_HELP_COPY } from '../../../i18n/section-help-copy'
import { catalogFor, type Locale } from '../../../i18n/locale'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
export const dynamic = 'force-dynamic'

const tableColumns = (copy: ListCopy): DataTableColumn[] => [
  { id: 'title', header: copy.colTitle, hideable: false },
  { id: 'stage', header: copy.colStage },
  { id: 'owner', header: copy.colOwner },
  { id: 'nextAction', header: copy.colNextAction },
  { id: 'source', header: copy.colSource, defaultHidden: true },
  { id: 'email', header: copy.colEmail },
  { id: 'phone', header: copy.colPhone, defaultHidden: true },
  { id: 'created', header: copy.colCreated, defaultHidden: true },
]

function date(value: number, locale: Locale): string {
  return formatDate(value, locale, { dateStyle: 'medium' })
}

/** The company, or the person, a lead is about: the line that tells two leads apart at a glance. */
function leadSubject(lead: LeadItem['lead']): string | null {
  const person = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
  return lead.companyName ?? (person === '' ? null : person)
}

function NextActionCell({ at, ctx }: Readonly<{ at: number | null; ctx: RowContext }>) {
  if (at === null) return <EmptyValue />
  const late = at < ctx.now
  return (
    <time dateTime={new Date(at).toISOString()} className={late ? 'font-medium text-destructive' : undefined}>
      {date(at, ctx.locale)}
      {late ? ` · ${ctx.copy.overdue}` : ''}
    </time>
  )
}

function ResponseOverdueBadge({ label }: Readonly<{ label: string }>) {
  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400">
      {label}
    </span>
  )
}

function LeadTitleCell({ lead }: Readonly<{ lead: LeadItem['lead'] }>) {
  const subject = leadSubject(lead)
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" aria-hidden className="shrink-0 rounded-md">
        <AvatarFallback className="rounded-md text-[10px] font-semibold">
          {initials(subject ?? lead.title)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <a href={`/leads/${lead.id}`} className="block truncate font-medium hover:underline">
          {lead.title}
        </a>
        {subject === null ? null : <span className="block truncate text-xs text-muted-foreground">{subject}</span>}
      </span>
    </span>
  )
}

type LeadItem = Awaited<ReturnType<typeof listLeads>>['items'][number]
type RowContext = Readonly<{ copy: ListCopy; locale: Locale; now: number }>

function row(item: LeadItem, ctx: RowContext): DataTableRow {
  const lead = item.lead
  return {
    id: lead.id,
    cells: {
      title: <LeadTitleCell lead={lead} />,
      stage: (
        <span className="inline-flex items-center gap-1.5">
          <StageDot color={item.stage.color} />
          {item.stage.name}
          {item.responseOverdue ? <ResponseOverdueBadge label={ctx.copy.responseOverdue} /> : null}
        </span>
      ),
      owner: <PersonCell name={item.owner?.name ?? null} empty="—" />,
      nextAction: <NextActionCell at={lead.nextActionAt} ctx={ctx} />,
      source: item.source?.name ?? <EmptyValue />,
      email: lead.email ?? <EmptyValue />,
      phone: lead.phone ?? <EmptyValue />,
      created: <time dateTime={new Date(lead.createdAt).toISOString()}>{date(lead.createdAt, ctx.locale)}</time>,
    },
  }
}

function pageHref(params: SearchParams, page: number): string {
  const next = new URLSearchParams()
  const query = Array.isArray(params.q) ? params.q[0] : params.q
  if (query) next.set('q', query)
  parseLeadStages(params.stage).forEach((stage) => {
    next.append('stage', stage)
  })
  for (const facet of ['source', 'owner'] as const) {
    const value = parseLeadSearch(params[facet])
    if (value) next.set(facet, value)
  }
  next.set('page', String(page))
  return `/leads?${next.toString()}`
}

/** The table and board share the search and stage filters; the board has no source or owner filter. */
function viewSwitcher(params: SearchParams) {
  const query = new URLSearchParams()
  const q = parseLeadSearch(params.q)
  if (q) query.set('q', q)
  parseLeadStages(params.stage).forEach((stage) => {
    query.append('stage', stage)
  })
  const suffix = query.toString() === '' ? '' : `?${query.toString()}`
  return (
    <ViewSwitcher
      label="Lead views"
      active="table"
      views={leadViews({ tableHref: `/leads${suffix}`, boardHref: `/leads/board${suffix}` })}
    />
  )
}

function openStages(stages: Awaited<ReturnType<typeof listLeads>>['stages']) {
  return stages.filter((stage) => !['done_success', 'done_failure', 'cancelled'].includes(stage.category))
}

const SCALAR_FILTERS = ['q', 'source', 'owner'] as const

/** Turns a saved view's stored filter back into the list's query string. */
function filterQuery(filter: Record<string, unknown>): string {
  const query = new URLSearchParams()
  for (const key of SCALAR_FILTERS) {
    const value = filter[key]
    if (typeof value === 'string' && value !== '') query.set(key, value)
  }
  const stages = Array.isArray(filter.stages) ? filter.stages : []
  for (const stage of stages) query.append('stage', String(stage))
  return query.toString()
}

function viewLinks(views: Awaited<ReturnType<typeof listSavedViews>>): LeadViewLink[] {
  return views.map((view) => ({
    id: view.id,
    label: view.name,
    query: filterQuery(
      typeof view.filter === 'object' && view.filter !== null ? (view.filter as Record<string, unknown>) : {},
    ),
  }))
}

function LeadTable({
  result,
  params,
  canBulk,
  locale,
}: Readonly<{
  result: Awaited<ReturnType<typeof listLeads>>
  params: SearchParams
  canBulk: boolean
  locale: Locale
}>) {
  return (
    <BulkTable
      bulk={
        canBulk
          ? {
              owners: result.owners,
              stages: openStages(result.stages),
              assign: assignLeadsAction,
              move: moveLeadsAction,
            }
          : null
      }
      key={`${String(result.page)}:${String(result.total)}`}
      columns={tableColumns(catalogFor(LIST_COPY, locale))}
      rows={result.items.map((item) => row(item, { copy: catalogFor(LIST_COPY, locale), locale, now: Date.now() }))}
      pagination={paginationFor({ ...result, href: (page) => pageHref(params, page) })}
      labels={catalogFor(TABLE_LABELS, locale)}
      mobileCard={{ cells: ['title', 'stage', 'owner', 'created'] }}
      emptyState={
        <ListEmpty
          kind="leads"
          filtered={['q', 'stage', 'source', 'owner'].some((name) => params[name] !== undefined && params[name] !== '')}
          clearHref="/leads"
          createHref="/leads/new"
        />
      }
    />
  )
}

export default async function LeadsPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const locale = await loadWorkspaceLocale()
  const help = catalogFor(SECTION_HELP_COPY, locale)
  const params = await searchParams
  const { actor } = await getProductContext()
  const canBulk = actor.role === 'owner' || actor.role === 'manager'
  const views = viewLinks(await listSavedViews('lead'))
  const result = await listLeads({
    q: parseLeadSearch(params.q),
    stages: parseLeadStages(params.stage),
    source: parseLeadSearch(params.source),
    owner: parseLeadSearch(params.owner),
    page: Number(params.page) || 1,
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Leads' }]} />
      <PageContent>
        <PageHeader
          title="Leads"
          description={help.leads}
          count={result.total}
          actions={
            <>
              <ImportLink type="lead" />
              <ExportLink kind="leads" />
              <LeadCreateDialogClient />
              {viewSwitcher(params)}
            </>
          }
        />
        <LeadListControls stages={result.stages} sources={result.sources} />
        <LeadFilterChips stages={result.stages} sources={result.sources} />
        <LeadViewControls views={[{ id: 'all', label: 'All open leads', query: '' }, ...views]} />
        <LeadTable result={result} params={params} canBulk={canBulk} locale={locale} />
      </PageContent>
    </>
  )
}

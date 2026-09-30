import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { type DataTableColumn, type DataTableLabels, type DataTableRow } from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { UserPlus } from 'lucide-react'
import type { Metadata } from 'next'
import { listLeads, parseLeadSearch, parseLeadStages } from '../../../server/crm/leads/queries'
import { getProductContext } from '../../../server/auth/context'
import { formatDate } from '../../../i18n/format'
import { listSavedViews } from '../../../server/queries/settings/listSavedViews'
import { LeadBulkTable } from './LeadBulkTable'
import { LeadListControls } from './LeadListControls'
import { LeadViewControls, type LeadViewLink } from './LeadViewControls'
import { LeadCreateDialogClient } from '../quick-create/LeadCreateDialogClient'

type SearchParams = Record<string, string | string[] | undefined>
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

const TABLE_LABELS: DataTableLabels = {
  selectAll: 'Select all',
  selectRow: 'Select row',
  columns: 'Columns',
  previous: 'Previous',
  next: 'Next',
  range: '{from}–{to} of {total}',
  selected: '{count} selected',
}

const TABLE_COLUMNS: DataTableColumn[] = [
  { id: 'title', header: 'Title', hideable: false },
  { id: 'stage', header: 'Stage' },
  { id: 'owner', header: 'Owner' },
  { id: 'source', header: 'Source' },
  { id: 'email', header: 'Email' },
  { id: 'phone', header: 'Phone' },
  { id: 'created', header: 'Created' },
]

function date(value: number): string {
  return formatDate(value, undefined, { dateStyle: 'medium' })
}
function empty(value: string | null | undefined) {
  return value ? <span>{value}</span> : <span className="text-muted-foreground">—</span>
}

function row(item: Awaited<ReturnType<typeof listLeads>>['items'][number]): DataTableRow {
  const lead = item.lead
  return {
    id: lead.id,
    cells: {
      title: (
        <a href={`/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.title}
        </a>
      ),
      stage: (
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full bg-stage-${item.stage.color}`} />
          {item.stage.name}
        </span>
      ),
      owner: empty(item.owner?.name),
      source: empty(item.source?.name),
      email: empty(lead.email),
      phone: empty(lead.phone),
      created: <time dateTime={new Date(lead.createdAt).toISOString()}>{date(lead.createdAt)}</time>,
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
}: Readonly<{ result: Awaited<ReturnType<typeof listLeads>>; params: SearchParams; canBulk: boolean }>) {
  return (
    <LeadBulkTable
      bulk={canBulk ? { owners: result.owners, stages: openStages(result.stages) } : null}
      key={`${String(result.page)}:${String(result.total)}`}
      columns={TABLE_COLUMNS}
      rows={result.items.map(row)}
      pagination={{
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        ...(result.page > 1 ? { previousHref: pageHref(params, result.page - 1) } : {}),
        ...(result.page * result.pageSize < result.total ? { nextHref: pageHref(params, result.page + 1) } : {}),
      }}
      labels={TABLE_LABELS}
      mobileCard={{ cells: ['title', 'stage', 'owner', 'created'] }}
      emptyState={
        <EmptyState
          icon={UserPlus}
          title="No leads yet"
          description="Create a lead or connect a website form to start your pipeline."
          action={
            <a
              className="ops-action-button inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
              href="/leads/new"
            >
              New lead
            </a>
          }
        />
      }
    />
  )
}

export default async function LeadsPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParams> }>) {
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
        <PageHeader title="Leads" count={result.total} actions={<LeadCreateDialogClient />} />
        <LeadListControls stages={result.stages} sources={result.sources} />
        <LeadViewControls views={[{ id: 'all', label: 'All open leads', query: '' }, ...views]} />
        <LeadTable result={result} params={params} canBulk={canBulk} />
      </PageContent>
    </>
  )
}

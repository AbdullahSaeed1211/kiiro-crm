import { Button } from '@ops/ui/components/ui/button'
import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
  type DataTablePaginationState,
  type DataTableRow,
} from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageContent } from '@ops/ui/composites/AppShell'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { Handshake, LayoutGrid, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DealCreateDialog } from './DealCreateDialog'
import { filterDeals, formatDate, formatMoney } from '../../../server/crm/deals/view-model'
import { getDealListData } from '../../../server/crm/deals/queries'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deals' }
export const dynamic = 'force-dynamic'

const LABELS: DataTableLabels = {
  selectAll: 'Select all',
  selectRow: 'Select row',
  columns: 'Columns',
  previous: 'Previous',
  next: 'Next',
  range: '{from}–{to} of {total}',
  selected: '{count} selected',
}
const STAGE_PILL: Record<string, string> = {
  gray: 'bg-stage-gray/15',
  blue: 'bg-stage-blue/15',
  green: 'bg-stage-green/15',
  amber: 'bg-stage-amber/15',
  red: 'bg-stage-red/15',
  violet: 'bg-stage-violet/15',
  teal: 'bg-stage-teal/15',
  pink: 'bg-stage-pink/15',
}
const STAGE_DOT: Record<string, string> = {
  gray: 'bg-stage-gray',
  blue: 'bg-stage-blue',
  green: 'bg-stage-green',
  amber: 'bg-stage-amber',
  red: 'bg-stage-red',
  violet: 'bg-stage-violet',
  teal: 'bg-stage-teal',
  pink: 'bg-stage-pink',
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
function stageCell(stage: { name: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_PILL[stage.color] ?? STAGE_PILL.gray}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[stage.color] ?? STAGE_DOT.gray}`} />
      {stage.name}
    </span>
  )
}
function rowOf(item: Awaited<ReturnType<typeof getDealListData>>['items'][number]): DataTableRow {
  return {
    id: String(item.deal.id),
    cells: {
      title: (
        <Link className="font-medium hover:underline" href={`/deals/${String(item.deal.id)}`}>
          {item.deal.title}
        </Link>
      ),
      stage: stageCell(item.stage),
      value: <span className="tabular-nums">{formatMoney(item.deal.value)}</span>,
      organization: item.organizationName ?? <span className="text-muted-foreground">—</span>,
      owner: item.ownerName ?? <span className="text-muted-foreground">Unassigned</span>,
      expectedCloseAt: <span className="tabular-nums">{formatDate(item.deal.expectedCloseAt)}</span>,
    },
  }
}

function columns(): DataTableColumn[] {
  return [
    { id: 'title', header: 'Title', hideable: false },
    { id: 'stage', header: 'Stage' },
    { id: 'value', header: 'Value', numeric: true },
    { id: 'organization', header: 'Organization' },
    { id: 'owner', header: 'Owner' },
    { id: 'expectedCloseAt', header: 'Expected close' },
  ]
}
function pagination(
  input: Readonly<{ page: number; total: number; query: string; stageId: string | undefined }>,
): DataTablePaginationState {
  const { page, total, query, stageId } = input
  const href = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query !== '') params.set('q', query)
    if (stageId !== undefined) params.set('stage', stageId)
    params.set('page', String(nextPage))
    return `?${params.toString()}`
  }
  return {
    page,
    pageSize: 50,
    total,
    ...(page > 1 ? { previousHref: href(page - 1) } : {}),
    ...(page * 50 < total ? { nextHref: href(page + 1) } : {}),
  }
}

export default async function DealsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const data = await getDealListData()
  const rawQuery = first(params.q)?.trim() ?? ''
  const query = rawQuery.toLowerCase()
  const stageId = first(params.stage)
  const filtered = filterDeals(data.items, query, stageId)
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1)
  const visible = filtered.slice((page - 1) * 50, page * 50)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals' }]} />
      <PageContent>
        <PageHeader
          title="Deals"
          count={filtered.length}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" nativeButton={false} render={<Link href="/deals/board" />}>
                <LayoutGrid aria-hidden />
                Board
              </Button>
              <DealCreateDialog
                organizations={data.organizations.map(({ id, name }) => ({ id, name }))}
                contacts={data.contacts.map((contact) => ({
                  id: contact.id,
                  name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
                }))}
              />
            </div>
          }
        />
        <form className="flex max-w-sm items-center gap-2" action="/deals">
          <Search aria-hidden className="size-4 text-muted-foreground" />
          <input
            name="q"
            aria-label="Search deals"
            defaultValue={first(params.q)}
            placeholder="Search deals…"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <select
            name="stage"
            defaultValue={stageId ?? ''}
            aria-label="Filter by stage"
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="">All stages</option>
            {data.workflow.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </form>
        <DataTable
          key={`${query}:${String(page)}`}
          columns={columns()}
          rows={visible.map(rowOf)}
          pagination={pagination({ page, total: filtered.length, query: rawQuery, stageId })}
          labels={LABELS}
          emptyState={
            <EmptyState
              icon={Handshake}
              title="No deals yet"
              description="Create a deal to start tracking your pipeline."
            />
          }
        />
      </PageContent>
    </>
  )
}

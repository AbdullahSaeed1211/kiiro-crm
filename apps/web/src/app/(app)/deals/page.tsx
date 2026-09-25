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
import { formatDate, formatMoney } from '../../../server/crm/deals/view-model'
import { getDealListData } from '../../../server/crm/deals/queries'
import { getWorkspaceSettings } from '../../../server/auth/context'
import { firstParam } from '../search-params'
import { StagePill, toStageColor } from '@ops/ui/composites/StagePill'

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

function rowOf(item: Awaited<ReturnType<typeof getDealListData>>['items'][number]): DataTableRow {
  return {
    id: String(item.deal.id),
    cells: {
      title: (
        <Link className="font-medium hover:underline" href={`/deals/${String(item.deal.id)}`}>
          {item.deal.title}
        </Link>
      ),
      stage: <StagePill name={item.stage.name} color={toStageColor(item.stage.color)} size="sm" />,
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
  const rawQuery = firstParam(params.q)?.trim() ?? ''
  const stageId = firstParam(params.stage)
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const [data, settings] = await Promise.all([
    getDealListData({ query: rawQuery, stageId, page }),
    getWorkspaceSettings(),
  ])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals' }]} />
      <PageContent>
        <PageHeader
          title="Deals"
          count={data.total}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" nativeButton={false} render={<Link href="/deals/board" />}>
                <LayoutGrid aria-hidden />
                Board
              </Button>
              <DealCreateDialog
                currency={currency}
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
            defaultValue={firstParam(params.q)}
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
          key={`${rawQuery}:${stageId ?? ''}:${String(page)}`}
          columns={columns()}
          rows={data.items.map(rowOf)}
          pagination={pagination({ page, total: data.total, query: rawQuery, stageId })}
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

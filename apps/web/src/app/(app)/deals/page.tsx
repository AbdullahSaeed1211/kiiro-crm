import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { ExportLink } from '../ExportLink'
import { TABLE_LABELS } from '../../../i18n/table-labels'
import { LIST_COPY, type ListCopy } from '../../../i18n/list-copy'
import { PersonCell } from '../person-cell'
import {
  type DataTableColumn,
  type DataTablePaginationState,
  type DataTableRow,
  paginationFor,
} from '@ops/ui/composites/DataTable'
import { PageContent } from '@ops/ui/composites/AppShell'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import Link from 'next/link'
import { assignDealsAction, moveDealsAction } from '../../../server/crm/deals/actions'
import { loadOwnerOptions } from '../../../server/crm/leads/queries'
import { createCrmRepository } from '@ops/adapter-payload'
import { getRequestContext } from '../../../server/container'
import { workflowOrThrow } from '../../../server/workflow-result'
import { BulkTable } from '../BulkTable'
import { DealCreateDialog } from './DealCreateDialog'
import { formatDate, formatMoney } from '../../../server/crm/deals/view-model'
import { getDealListData } from '../../../server/crm/deals/queries'
import { getWorkspaceSettings } from '../../../server/auth/context'
import { firstParam } from '../search-params'
import { ListViewBar, type ListFilter } from '../list-view-bar'
import { StagePill, toStageColor } from '@ops/ui/composites/StagePill'
import { ListEmpty } from '../ListEmpty'
import { CRM_LIST_CONTROLS_COPY, type CrmListControlsCopy } from '../../../i18n/crm-list-controls-copy'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deals' }
import { SECTION_HELP_COPY } from '../../../i18n/section-help-copy'
import { catalogFor } from '../../../i18n/locale'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
export const dynamic = 'force-dynamic'

function rowOf(item: Awaited<ReturnType<typeof getDealListData>>['items'][number], copy: ListCopy): DataTableRow {
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
      organization: <PersonCell name={item.organizationName} empty="—" />,
      owner: <PersonCell name={item.ownerName} empty={copy.unassigned} />,
      expectedCloseAt: <span className="tabular-nums">{formatDate(item.deal.expectedCloseAt)}</span>,
    },
  }
}

function columns(copy: ListCopy): DataTableColumn[] {
  return [
    { id: 'title', header: copy.colTitle, hideable: false },
    { id: 'organization', header: copy.colOrganization },
    { id: 'stage', header: copy.colStage },
    { id: 'value', header: copy.colValue, numeric: true },
    { id: 'owner', header: copy.colOwner, defaultHidden: true },
    { id: 'expectedCloseAt', header: copy.colExpectedClose, defaultHidden: true },
  ]
}
function pagination(
  input: Readonly<{ page: number; total: number; query: string; stageId: string | undefined }>,
): DataTablePaginationState {
  const { page, total, query, stageId } = input
  return paginationFor({
    page,
    pageSize: 50,
    total,
    href: (nextPage) => {
      const params = new URLSearchParams()
      if (query !== '') params.set('q', query)
      if (stageId !== undefined) params.set('stage', stageId)
      params.set('page', String(nextPage))
      return `?${params.toString()}`
    },
  })
}

function stageFilter(
  input: Readonly<{
    stages: readonly { id: string; name: string }[]
    stageId: string | undefined
    controls: CrmListControlsCopy
  }>,
): ListFilter {
  const { stages, stageId, controls } = input
  return {
    name: 'stage',
    label: controls.dealStage,
    allLabel: controls.allStages,
    value: stageId ?? '',
    options: [
      { value: 'open', label: controls.openDeals },
      ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
    ],
  }
}

/** Owners and managers can assign and move deals in bulk; the stages offered are the open ones. */
async function bulkOptions() {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') return null
  const [owners, workflow] = await Promise.all([
    loadOwnerOptions(context),
    createCrmRepository(context.req).loadDefaultWorkflow('deal').then(workflowOrThrow),
  ])
  const stages = workflow.stages
    .filter((stage) => !stage.category.startsWith('done') && stage.category !== 'cancelled')
    .map(({ id, name }) => ({ id, name }))
  return { owners, stages, assign: assignDealsAction, move: moveDealsAction }
}

/** True when a search or stage filter is on. */
function isFiltered(query: string, stageId: string | undefined): boolean {
  return query !== '' || stageId !== undefined
}

/** The board keeps the search text, so switching views does not lose it. */
function boardHref(query: string): string {
  return query === '' ? '/deals/board' : `/deals/board?q=${encodeURIComponent(query)}`
}

export default async function DealsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const locale = await loadWorkspaceLocale()
  const help = catalogFor(SECTION_HELP_COPY, locale)
  const controls = catalogFor(CRM_LIST_CONTROLS_COPY, locale)
  const params = await searchParams
  const rawQuery = firstParam(params.q)?.trim() ?? ''
  const stageId = firstParam(params.stage)
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const [data, settings, bulk] = await Promise.all([
    getDealListData({ query: rawQuery, stageId, page }),
    getWorkspaceSettings(),
    bulkOptions(),
  ])
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals' }]} />
      <PageContent>
        <PageHeader
          title="Deals"
          description={help.deals}
          count={data.total}
          actions={
            <div className="flex items-center gap-2">
              <DealCreateDialog currency={currency} />
              <ExportLink kind="deals" />
              <ViewSwitcher
                label="Deal views"
                active="table"
                views={[
                  { id: 'table', label: 'Table', href: '/deals' },
                  {
                    id: 'board',
                    label: 'Board',
                    href: boardHref(rawQuery),
                  },
                ]}
              />
            </div>
          }
        />
        <ListViewBar
          searchLabel={controls.searchDeals}
          query={firstParam(params.q) ?? ''}
          filters={[stageFilter({ stages: data.workflow.stages, stageId, controls })]}
        />
        <BulkTable
          bulk={bulk}
          key={`${rawQuery}:${stageId ?? ''}:${String(page)}`}
          columns={columns(catalogFor(LIST_COPY, locale))}
          rows={data.items.map((item) => rowOf(item, catalogFor(LIST_COPY, locale)))}
          mobileCard={{ cells: ['title', 'stage', 'value', 'organization'] }}
          pagination={pagination({ page, total: data.total, query: rawQuery, stageId })}
          labels={catalogFor(TABLE_LABELS, locale)}
          emptyState={<ListEmpty kind="deals" filtered={isFiltered(rawQuery, stageId)} clearHref="/deals" />}
        />
      </PageContent>
    </>
  )
}

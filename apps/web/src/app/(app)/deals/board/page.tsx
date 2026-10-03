import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { Metadata } from 'next'
import { catalogFor } from '../../../../i18n/locale'
import { DEAL_BOARD_COPY } from '../../../../i18n/deal-board-copy'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { ListViewBar } from '../../list-view-bar'
import { firstParam } from '../../search-params'
import { DealBoard } from '../DealBoard'
import { DealCreateDialog } from '../DealCreateDialog'
import { BOARD_LIMIT } from '../../../../server/crm/board-limit'
import { getDealListData } from '../../../../server/crm/deals/queries'
import { aggregateStageTotals, formatDate, formatMoney } from '../../../../server/crm/deals/view-model'
import { getWorkspaceSettings } from '../../../../server/auth/context'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deal board' }
export const dynamic = 'force-dynamic'
const LABELS: KanbanBoardLabels = {
  expand: 'Expand {name}',
  collapse: 'Collapse {name}',
  moveTo: 'Move to…',
  moveFailed: 'Could not move the deal',
  conflict: 'Updated by someone else, refreshed',
}

function stageAmount(input: Readonly<{ amountMinor: number; currency: string | null; mixed: string }>): string {
  if (input.currency !== null) return formatMoney({ amountMinor: input.amountMinor, currency: input.currency })
  // A total of deals in different currencies would be meaningless, so it is not added up.
  return input.amountMinor === 0 ? '—' : input.mixed
}

export default async function DealBoardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = firstParam((await searchParams).q)?.trim() ?? ''
  const mixed = catalogFor(DEAL_BOARD_COPY, await loadWorkspaceLocale()).mixedCurrencies
  const [data, settings] = await Promise.all([
    getDealListData({ query, pageSize: BOARD_LIMIT }),
    getWorkspaceSettings(),
  ])
  const carry = query === '' ? '' : `?q=${encodeURIComponent(query)}`
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const totals = aggregateStageTotals(
    data.items.map(({ deal }) => deal),
    data.workflow,
  )
  const stages: KanbanStage[] = data.workflow.stages.map(({ id, name, category, color }) => {
    const total = totals.find((item) => item.stageId === id)
    const amount = stageAmount({ amountMinor: total?.amountMinor ?? 0, currency: total?.currency ?? null, mixed })
    return { id, name: `${name} · ${amount}`, category, color }
  })
  const cards: KanbanCard[] = data.items.map(({ deal, organizationName, ownerName }) => ({
    id: deal.id,
    stageId: deal.stageId,
    title: deal.title,
    updatedAt: deal.updatedAt,
    meta: (
      <span className="flex flex-wrap gap-2">
        <span className="font-medium tabular-nums">{formatMoney(deal.value)}</span>
        {organizationName === null ? null : <span>{organizationName}</span>}
        <span>Owner: {ownerName ?? 'Unassigned'}</span>
        {deal.expectedCloseAt === null ? null : <span>Expected close: {formatDate(deal.expectedCloseAt)}</span>}
      </span>
    ),
  }))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals', href: '/deals' }, { label: 'Board' }]} />
      <PageContent>
        <PageHeader
          title="Deal board"
          count={data.total}
          actions={
            <div className="flex items-center gap-2">
              <DealCreateDialog currency={currency} />
              <ViewSwitcher
                label="Deal views"
                active="board"
                views={[
                  { id: 'table', label: 'Table', href: `/deals${carry}` },
                  { id: 'board', label: 'Board', href: `/deals/board${carry}` },
                ]}
              />
            </div>
          }
        />
        <ListViewBar searchLabel="Search deals" query={query} />
        <DealBoard
          stages={stages}
          cards={cards.map((card) => ({ ...card, href: `/deals/${encodeURIComponent(card.id)}` }))}
          labels={LABELS}
          lostReasons={data.lostReasons}
        />
      </PageContent>
    </>
  )
}

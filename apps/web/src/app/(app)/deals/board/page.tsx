import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { shellLabels } from '../../../../server/shell-labels'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { Metadata } from 'next'
import { catalogFor } from '../../../../i18n/locale'
import { boardLabels } from '../../../../i18n/board-labels-copy'
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
function stageAmount(input: Readonly<{ amountMinor: number; currency: string | null; mixed: string }>): string {
  if (input.currency !== null) return formatMoney({ amountMinor: input.amountMinor, currency: input.currency })
  // A total of deals in different currencies would be meaningless, so it is not added up.
  return input.amountMinor === 0 ? '—' : input.mixed
}

export default async function DealBoardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const label = await shellLabels()
  const query = firstParam((await searchParams).q)?.trim() ?? ''
  const locale = await loadWorkspaceLocale()
  const boardCopy = catalogFor(DEAL_BOARD_COPY, locale)
  const mixed = boardCopy.mixedCurrencies
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
        <span>{boardCopy.owner.replace('{name}', ownerName ?? boardCopy.unassigned)}</span>
        {deal.expectedCloseAt === null ? null : (
          <span>{boardCopy.expectedClose.replace('{date}', formatDate(deal.expectedCloseAt))}</span>
        )}
      </span>
    ),
  }))
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('deals'), href: '/deals' }, { label: label('board') }]} />
      <PageContent>
        <PageHeader
          title={boardCopy.board}
          count={data.total}
          tabs={
            <ViewSwitcher
              label={boardCopy.views}
              active="board"
              views={[
                { id: 'table', label: boardCopy.table, href: `/deals${carry}` },
                { id: 'board', label: boardCopy.boardView, href: `/deals/board${carry}` },
              ]}
            />
          }
          actions={<DealCreateDialog currency={currency} />}
        />
        <ListViewBar searchLabel={boardCopy.searchDeals} query={query} />
        <DealBoard
          stages={stages}
          cards={cards.map((card) => ({ ...card, href: `/deals/${encodeURIComponent(card.id)}` }))}
          labels={boardLabels(locale, 'deal')}
          lostReasons={data.lostReasons}
        />
      </PageContent>
    </>
  )
}

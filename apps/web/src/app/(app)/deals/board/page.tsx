import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { KanbanBoardLabels, KanbanCard, KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@ops/ui/components/ui/button'
import { DealBoard } from '../DealBoard'
import { DealCreateDialog } from '../DealCreateDialog'
import { getDealListData } from '../../../../server/crm/deals/queries'
import { aggregateStageTotals, formatMoney } from '../../../../server/crm/deals/view-model'

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

function stageAmount(amountMinor: number, currency: string | null): string {
  if (currency !== null) return formatMoney({ amountMinor, currency })
  if (amountMinor === 0) return '—'
  return String(amountMinor / 100)
}

export default async function DealBoardPage() {
  const data = await getDealListData()
  const totals = aggregateStageTotals(
    data.items.map(({ deal }) => deal),
    data.workflow,
  )
  const stages: KanbanStage[] = data.workflow.stages.map(({ id, name, category, color }) => {
    const total = totals.find((item) => item.stageId === id)
    const amount = stageAmount(total?.amountMinor ?? 0, total?.currency ?? null)
    return { id, name: `${name} · ${amount}`, category, color }
  })
  const cards: KanbanCard[] = data.items.map(({ deal, organizationName }) => ({
    id: deal.id,
    stageId: deal.stageId,
    title: deal.title,
    updatedAt: deal.updatedAt,
    meta: (
      <span className="flex flex-wrap gap-2">
        <span className="font-medium tabular-nums">{formatMoney(deal.value)}</span>
        {organizationName === null ? null : <span>{organizationName}</span>}
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
              <Button variant="outline" nativeButton={false} render={<Link href="/deals" />}>
                Table
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

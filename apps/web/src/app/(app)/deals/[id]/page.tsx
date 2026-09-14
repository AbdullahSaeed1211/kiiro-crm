import { Badge } from '@ops/ui/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DealControls } from '../DealControls'
import { getDealDetailData, type ActivityItem, type DealDetailData } from '../../../../server/crm/deals/queries'
import { formatDate, formatMoney } from '../../../../server/crm/deals/view-model'
import { RecordActionLinks } from '../../record-action-links'

export const dynamic = 'force-dynamic'
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deal' }

function ActivityCard({ activity }: Readonly<{ activity: readonly ActivityItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Recent changes and stage history for this deal.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          activity.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{item.verb.replaceAll('.', ' ')}</p>
                <p className="text-xs text-muted-foreground">{item.actorName ?? 'System'}</p>
              </div>
              <time className="text-xs text-muted-foreground tabular-nums">{formatDate(item.occurredAt)}</time>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function DetailsCard({ data }: Readonly<{ data: DealDetailData }>) {
  const { deal, organization } = data
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium tabular-nums">{formatMoney(deal.value)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Created</span>
          <span>{formatDate(deal.createdAt)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Closed</span>
          <span>{formatDate(deal.closedAt)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Organization</span>
          <span>{organization?.name ?? '—'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function DealHero({ data }: Readonly<{ data: DealDetailData }>) {
  const { deal, stage } = data
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/deals" className="text-xs text-muted-foreground hover:underline">
          ← All deals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{deal.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{stage.name}</Badge>
          <span className="text-lg font-semibold tabular-nums">{formatMoney(deal.value)}</span>
        </div>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        Expected close
        <br />
        <span className="font-medium text-foreground">{formatDate(deal.expectedCloseAt)}</span>
      </div>
      <RecordActionLinks recordType="deal" recordId={deal.id} recordLabel={deal.title} />
    </div>
  )
}

function ControlsCard({ data }: Readonly<{ data: DealDetailData }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls & relationships</CardTitle>
        <CardDescription>Update value, stage, and contacts.</CardDescription>
      </CardHeader>
      <CardContent>
        <DealControls
          deal={data.deal}
          stages={data.workflow.stages}
          lostReasons={data.lostReasons}
          stageCategory={data.stage.category}
          contacts={data.allContacts.map((contact) => ({
            id: contact.id,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
          }))}
        />
      </CardContent>
    </Card>
  )
}

function DealRecordView({ data }: Readonly<{ data: DealDetailData }>) {
  return (
    <>
      <DealHero data={data} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="grid gap-5">
          <ActivityCard activity={data.activity} />
          <DetailsCard data={data} />
        </main>
        <aside>
          <ControlsCard data={data} />
        </aside>
      </div>
    </>
  )
}

export default async function DealRecordPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const data = await getDealDetailData(id)
  if (data === null) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals', href: '/deals' }, { label: data.deal.title }]} />
      <PageContent>
        <DealRecordView data={data} />
      </PageContent>
    </>
  )
}

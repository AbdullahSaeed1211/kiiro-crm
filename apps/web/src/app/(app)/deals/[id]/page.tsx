import { Badge } from '@ops/ui/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DealControls } from '../DealControls'
import { getDealDetailData, type ActivityItem, type DealDetailData } from '../../../../server/crm/deals/queries'
import { formatDate, formatMoney } from '../../../../server/crm/deals/view-model'
import { RecordActionLinks } from '../../record-action-links'
import { recordTabs } from '../../record-view-primitives'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { getWorkspaceSettings } from '../../../../server/auth/context'

export const dynamic = 'force-dynamic'
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deal' }

function ActivityCard({ activity }: Readonly<{ activity: readonly ActivityItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
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

function ControlsCard({ data, currency }: Readonly<{ data: DealDetailData; currency: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <DealControls
          deal={data.deal}
          stages={data.workflow.stages}
          lostReasons={data.lostReasons}
          stageCategory={data.stage.category}
          currency={currency}
          contacts={data.allContacts.map((contact) => ({
            id: contact.id,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
          }))}
        />
      </CardContent>
    </Card>
  )
}

function DealRecordView({
  data,
  outboundEmailEnabled,
  currency,
}: Readonly<{ data: DealDetailData; outboundEmailEnabled: boolean; currency: string }>) {
  return (
    <RecordPageLayout
      labels={{ breadcrumb: 'Deal', saveTitle: 'Save title', cancelTitle: 'Cancel' }}
      title={data.deal.title}
      stage={<Badge variant="outline">{data.stage.name}</Badge>}
      actions={
        <RecordActionLinks
          recordType="deal"
          recordId={data.deal.id}
          recordLabel={data.deal.title}
          outboundEmailEnabled={outboundEmailEnabled}
        />
      }
      tabs={recordTabs(<ActivityCard activity={data.activity} />, data.emailMessages, {
        recordType: 'deal',
        recordId: data.deal.id,
        recipient: data.contacts.find((contact) => contact.id === data.deal.primaryContactId)?.email,
        outboundEmailEnabled,
        tasks: data.relatedTasks,
        attachments: data.attachments,
      })}
      aside={
        <div className="grid gap-4">
          <ControlsCard data={data} currency={currency} />
          <DetailsCard data={data} />
        </div>
      }
    />
  )
}

export default async function DealRecordPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const [data, outboundEmailEnabled, settings] = await Promise.all([
    getDealDetailData(id),
    getOutboundEmailEnabled(),
    getWorkspaceSettings(),
  ])
  if (data === null) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals', href: '/deals' }, { label: data.deal.title }]} />
      <PageContent>
        <DealRecordView
          data={data}
          outboundEmailEnabled={outboundEmailEnabled}
          currency={typeof settings.currency === 'string' ? settings.currency : 'USD'}
        />
      </PageContent>
    </>
  )
}

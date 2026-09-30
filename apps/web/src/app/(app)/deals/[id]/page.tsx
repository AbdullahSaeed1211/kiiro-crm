import { ActivityFeed } from '@ops/ui'
import { RecordNotesTab } from '../../record-notes-tab'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDealDetailData } from '../../../../server/crm/deals/queries'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { recordTabs } from '../../record-view-primitives'
import { RecordCustomFields } from '../../record-custom-fields'
import { DealRecordClient } from './DealRecordClient'

export const dynamic = 'force-dynamic'
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deal' }

export default async function DealRecordPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const [data, outboundEmailEnabled, settings] = await Promise.all([
    getDealDetailData(id),
    getOutboundEmailEnabled(),
    getWorkspaceSettings(),
  ])
  if (data === null) notFound()

  const activity = data.activity.map((entry) => ({
    id: entry.id,
    occurredAt: entry.occurredAt,
    actorName: entry.actorName,
    summary: <span>{entry.verb.replaceAll('.', ' ')}</span>,
  }))

  const activityFeed = (
    <ActivityFeed
      entries={activity}
      labels={{ heading: 'Activity', empty: 'No activity yet', loadMore: 'Load more', systemActor: 'System' }}
      locale="en"
    />
  )

  const tabs = recordTabs(activityFeed, data.emailMessages, {
    recordType: 'deal',
    recordId: data.deal.id,
    notes: <RecordNotesTab recordType="deal" recordId={data.deal.id} />,
    recipient: data.contacts.find((contact) => contact.id === data.deal.primaryContactId)?.email,
    outboundEmailEnabled,
    tasks: data.relatedTasks,
    attachments: data.attachments,
  })

  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Deals', href: '/deals' }, { label: data.deal.title }]} />
      <PageContent>
        <DealRecordClient
          data={data}
          outboundEmailEnabled={outboundEmailEnabled}
          currency={typeof settings.currency === 'string' ? settings.currency : 'USD'}
          tabs={tabs}
          customFields={<RecordCustomFields type="deal" id={data.deal.id} />}
        />
      </PageContent>
    </>
  )
}

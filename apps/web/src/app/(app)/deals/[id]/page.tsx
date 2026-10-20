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
import { ArchiveRecordControl } from '../../archive-record-control'
import { DealOriginLinks } from '../DealOriginLinks'
import { DealRecordClient } from './DealRecordClient'
import { catalogFor } from '../../../../i18n/locale'
import { RECORD_COPY } from '../../../../i18n/record-copy'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'

export const dynamic = 'force-dynamic'
/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: 'Deal' }

export default async function DealRecordPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const [data, outboundEmailEnabled, settings, locale] = await Promise.all([
    getDealDetailData(id),
    getOutboundEmailEnabled(),
    getWorkspaceSettings(),
    loadWorkspaceLocale(),
  ])
  if (data === null) notFound()
  const copy = catalogFor(RECORD_COPY, locale)

  const activity = data.activity.map((entry) => ({
    id: entry.id,
    occurredAt: entry.occurredAt,
    actorName: entry.actorName,
    summary: <span>{entry.verb.replaceAll('.', ' ')}</span>,
  }))

  const activityFeed = (
    <ActivityFeed
      entries={activity}
      labels={{
        heading: copy.tabActivity,
        empty: copy.noActivity,
        loadMore: copy.loadMore,
        systemActor: copy.systemActor,
      }}
      locale={locale}
    />
  )

  const tabs = recordTabs(copy, locale, activityFeed, data.emailMessages, {
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
      <AppHeader breadcrumbs={[{ label: copy.deals, href: '/deals' }, { label: data.deal.title }]} />
      <PageContent>
        <DealOriginLinks
          sourceLeadId={data.deal.sourceLeadId}
          projectId={
            typeof data.deal.customData.playbookProjectId === 'string' ? data.deal.customData.playbookProjectId : null
          }
        />
        <DealRecordClient
          data={data}
          outboundEmailEnabled={outboundEmailEnabled}
          currency={typeof settings.currency === 'string' ? settings.currency : 'USD'}
          tabs={tabs}
          customFields={<RecordCustomFields type="deal" id={data.deal.id} />}
          archive={<ArchiveRecordControl type="deal" id={data.deal.id} label={data.deal.title} />}
        />
      </PageContent>
    </>
  )
}

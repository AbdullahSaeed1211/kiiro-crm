import { AppHeader } from '@ops/ui/composites/AppHeader'
import { shellLabels } from '../../../../server/shell-labels'
import { PageContent } from '@ops/ui/composites/AppShell'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLeadPage, getLeadRecord } from '../../../../server/crm/leads/queries'
import type { LeadTab } from '../../../../server/crm/leads/lead-tab-data'
import { firstParam } from '../../search-params'
import { LeadRecordClient } from '../LeadRecordClient'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { RecordDetails } from '../../record-details'
import { LeadDuplicateNotice } from '../LeadDuplicateNotice'
import { RecordCustomFields } from '../../record-custom-fields'
import { ArchiveRecordControl } from '../../archive-record-control'
import { RecordNotesTab } from '../../record-notes-tab'
import { RecordCallLogsTab } from '../../record-call-logs-tab'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const lead = await getLeadRecord((await params).id)
  return { title: lead ? `${lead.title} · Leads` : 'Lead' }
}

const TABS: readonly LeadTab[] = ['notes', 'calls', 'activity', 'tasks', 'files', 'email']

/** A lead's page; the server builds only the tab in the address (the first, Notes, when there is none). */
export default async function LeadPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const label = await shellLabels()
  const query = await searchParams
  const tab = TABS.find((candidate) => candidate === firstParam(query.tab)) ?? 'notes'
  const [data, outboundEmailEnabled, settings] = await Promise.all([
    getLeadPage((await params).id, tab),
    getOutboundEmailEnabled(),
    getWorkspaceSettings(),
  ])
  if (data === null) notFound()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('leads'), href: '/leads' }, { label: data.item.lead.title }]} />
      <PageContent>
        <LeadDuplicateNotice leadId={data.item.lead.id} email={data.item.lead.email} phone={data.item.lead.phone} />
        <LeadRecordClient
          data={data}
          outboundEmailEnabled={outboundEmailEnabled}
          currency={typeof settings.currency === 'string' ? settings.currency : 'USD'}
          slots={{
            details: <RecordDetails type="lead" id={data.item.lead.id} />,
            customFields: <RecordCustomFields type="lead" id={data.item.lead.id} />,
            notes: tab === 'notes' ? <RecordNotesTab recordType="lead" recordId={data.item.lead.id} /> : null,
            calls: tab === 'calls' ? <RecordCallLogsTab recordType="lead" recordId={data.item.lead.id} /> : null,
            archive: <ArchiveRecordControl type="lead" id={data.item.lead.id} label={data.item.lead.title} />,
          }}
        />
      </PageContent>
    </>
  )
}

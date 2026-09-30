import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLeadPage } from '../../../../server/crm/leads/queries'
import { LeadRecordClient } from '../LeadRecordClient'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { RecordDetails } from '../../record-details'
import { LeadDuplicateNotice } from '../LeadDuplicateNotice'
import { RecordCustomFields } from '../../record-custom-fields'
import { ArchiveRecordControl } from '../../archive-record-control'
import { RecordNotesTab } from '../../record-notes-tab'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const data = await getLeadPage((await params).id)
  return { title: data ? `${data.item.lead.title} · Leads` : 'Lead' }
}

export default async function LeadPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [data, outboundEmailEnabled, settings] = await Promise.all([
    getLeadPage((await params).id),
    getOutboundEmailEnabled(),
    getWorkspaceSettings(),
  ])
  if (data === null) notFound()
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <LeadDuplicateNotice leadId={data.item.lead.id} email={data.item.lead.email} phone={data.item.lead.phone} />
      <LeadRecordClient
        data={data}
        outboundEmailEnabled={outboundEmailEnabled}
        currency={typeof settings.currency === 'string' ? settings.currency : 'USD'}
        slots={{
          details: <RecordDetails type="lead" id={data.item.lead.id} />,
          customFields: <RecordCustomFields type="lead" id={data.item.lead.id} />,
          notes: <RecordNotesTab recordType="lead" recordId={data.item.lead.id} />,
          archive: <ArchiveRecordControl type="lead" id={data.item.lead.id} label={data.item.lead.title} />,
        }}
      />
    </main>
  )
}

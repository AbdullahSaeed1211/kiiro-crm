import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLeadPage } from '../../../../server/crm/leads/queries'
import { LeadRecordClient } from '../LeadRecordClient'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const data = await getLeadPage((await params).id)
  return { title: data ? `${data.item.lead.title} · Leads` : 'Lead' }
}

export default async function LeadPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [data, outboundEmailEnabled] = await Promise.all([getLeadPage((await params).id), getOutboundEmailEnabled()])
  if (data === null) notFound()
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <LeadRecordClient data={data} outboundEmailEnabled={outboundEmailEnabled} />
    </main>
  )
}

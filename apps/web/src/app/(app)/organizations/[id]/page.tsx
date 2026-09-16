import { notFound } from 'next/navigation'
import { getOrganization } from '../../../../server/crm/directory/data'
import { OrganizationRecordView } from '../../directory-view'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

export default async function OrganizationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const data = await getOrganization((await params).id)
  if (data === null) notFound()
  return <OrganizationRecordView data={data} outboundEmailEnabled={await getOutboundEmailEnabled()} />
}

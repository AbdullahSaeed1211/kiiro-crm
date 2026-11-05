import { notFound } from 'next/navigation'
import { getContact, type ContactTab } from '../../../../server/crm/directory/data'
import { ContactRecordView } from '../../directory-view'
import { firstParam } from '../../search-params'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

const TABS: readonly ContactTab[] = ['notes', 'calls', 'activity', 'tasks', 'files', 'email']

/** A contact's page; the server builds only the tab in the address (the first, Notes, when there is none). */
export default async function ContactPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const tab = TABS.find((candidate) => candidate === firstParam(query.tab)) ?? 'notes'
  const data = await getContact(id, tab)
  if (data === null) notFound()
  return <ContactRecordView data={data} tab={tab} outboundEmailEnabled={await getOutboundEmailEnabled()} />
}

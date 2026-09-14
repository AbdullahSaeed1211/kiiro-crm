import { notFound } from 'next/navigation'
import { getContact } from '../../../../server/crm/directory/data'
import { ContactRecordView } from '../../directory-view'

export const dynamic = 'force-dynamic'

export default async function ContactPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const data = await getContact((await params).id)
  if (data === null) notFound()
  return <ContactRecordView data={data} />
}

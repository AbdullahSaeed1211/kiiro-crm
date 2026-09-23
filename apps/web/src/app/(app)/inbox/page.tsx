import type { Metadata } from 'next'
import { getOutboundEmailEnabled } from '../../../server/capabilities'
import { requireRole } from '../../../server/auth/context'
import { listInboxMessages } from '../../../server/crm/directory/helpers'
import type { Locale } from '../../../i18n/config'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { InboxClient } from './inbox-client'

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic'

type Folder = 'inbox' | 'sent' | 'failed' | 'all'

function initialFolder(direction: string | undefined, status: string | undefined): Folder {
  if (status === 'failed') return 'failed'
  if (direction === 'outbound') return 'sent'
  if (direction === 'inbound') return 'inbox'
  return 'inbox'
}

export default async function InboxPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ direction?: string; status?: string }> }>) {
  const context = await requireRole('owner', 'manager')
  const locale: Locale = await loadWorkspaceLocale()
  const params = await searchParams
  const direction = params.direction === 'inbound' || params.direction === 'outbound' ? params.direction : undefined
  const status = params.status === 'failed' ? params.status : undefined
  const [messages, outboundEmailEnabled] = await Promise.all([
    listInboxMessages(context, { direction, status }),
    getOutboundEmailEnabled(),
  ])
  return (
    <InboxClient
      messages={messages}
      locale={locale}
      initialFolder={initialFolder(direction, status)}
      outboundEmailEnabled={outboundEmailEnabled}
    />
  )
}

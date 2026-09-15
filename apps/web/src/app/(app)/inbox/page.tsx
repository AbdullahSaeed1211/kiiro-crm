import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '../../../server/auth/context'
import { listInboxMessages } from '../../../server/crm/directory/helpers'
import type { InboxEmailMessage } from '../../../server/crm/directory/types'

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic'

const RECORD_ROUTES: Readonly<Record<string, string | undefined>> = {
  contact: 'contacts',
  deal: 'deals',
  lead: 'leads',
  organization: 'organizations',
  project: 'projects',
}

const DATE_FORMAT = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

function recordHref(message: InboxEmailMessage): string | null {
  if (message.recordId === null) return null
  const route = RECORD_ROUTES[message.recordType ?? '']
  return route === undefined ? null : `/${route}/${message.recordId}`
}

function replyHref(message: InboxEmailMessage): string | null {
  const recipient = message.direction === 'inbound' ? message.from : message.to.at(0)
  if (recipient === undefined || recipient.trim() === '') return null
  const subject = message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`
  return `mailto:${recipient}?${new URLSearchParams({ subject }).toString()}`
}

function messageLabel(message: InboxEmailMessage): string {
  if (message.direction === 'inbound') return 'Received'
  if (message.status === 'failed') return 'Failed'
  if (message.status === 'queued') return 'Queued'
  return 'Sent'
}

export default async function InboxPage() {
  const context = await requireRole('owner', 'manager')
  const messages = await listInboxMessages(context)
  return (
    <>
      <header className="border-b px-4 py-4 md:px-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Communications</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inbound and outbound email linked to your workspace records.</p>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
        {messages.length === 0 ? (
          <section className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
            No email messages yet. Messages will appear here when inbound mail is linked to a CRM record.
          </section>
        ) : (
          <ol className="grid gap-3" aria-label="Email messages">
            {messages.map((message) => {
              const href = recordHref(message)
              const reply = replyHref(message)
              return (
                <li className="rounded-xl border bg-card p-4" key={message.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{message.subject}</h2>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {message.direction === 'inbound' ? 'From' : 'To'}{' '}
                        {message.direction === 'inbound' ? message.from : message.to.join(', ') || 'Unknown recipient'}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={new Date(message.occurredAt).toISOString()}>
                      {DATE_FORMAT.format(message.occurredAt)} · {messageLabel(message)}
                    </time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{message.textBody || 'No message body.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {href === null ? <span className="text-muted-foreground">Unlinked record</span> : <Link className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href}>Open linked record</Link>}
                    {reply === null ? null : <a className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={reply}>Reply in mail</a>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </main>
    </>
  )
}

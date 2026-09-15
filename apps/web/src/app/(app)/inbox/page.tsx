import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '../../../server/auth/context'
import { listInboxMessages } from '../../../server/crm/directory/helpers'
import type { InboxEmailMessage } from '../../../server/crm/directory/types'
import { INBOX_COPY } from '../../../i18n/config'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic'

const RECORD_ROUTES: Readonly<Record<string, string | undefined>> = {
  contact: 'contacts',
  deal: 'deals',
  lead: 'leads',
  organization: 'organizations',
  project: 'projects',
}

function dateFormat(locale: 'en' | 'es'): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function recordHref(message: InboxEmailMessage): string | null {
  if (message.recordId === null) return null
  const route = RECORD_ROUTES[message.recordType ?? '']
  return route === undefined ? null : `/${route}/${message.recordId}`
}

function messageLabel(message: InboxEmailMessage): string {
  if (message.direction === 'inbound') return 'Received'
  if (message.status === 'failed') return 'Failed'
  if (message.status === 'queued') return 'Queued'
  return 'Sent'
}

// eslint-disable-next-line max-lines-per-function -- inbox keeps filter controls and message rendering together for stable SSR semantics.
export default async function InboxPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ direction?: string; status?: string }> }>) {
  const context = await requireRole('owner', 'manager')
  const locale = await loadWorkspaceLocale(context)
  const copy = INBOX_COPY[locale]
  const params = await searchParams
  const direction = params.direction === 'inbound' || params.direction === 'outbound' ? params.direction : undefined
  const status = params.status === 'failed' ? params.status : undefined
  const messages = await listInboxMessages(context, { direction, status })
  const format = dateFormat(locale)
  const threads = [
    ...messages
      .reduce((groups, message) => {
        const key = message.threadKey
        const current = groups.get(key) ?? []
        current.push(message)
        groups.set(key, current)
        return groups
      }, new Map<string, InboxEmailMessage[]>())
      .values(),
  ]
  return (
    <>
      <header className="border-b px-4 py-4 md:px-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3" method="get">
          <label className="grid gap-1 text-xs font-medium">
            <span>{copy.filter}</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              name="direction"
              defaultValue={direction ?? ''}
            >
              <option value="">{copy.all}</option>
              <option value="inbound">{copy.inbound}</option>
              <option value="outbound">{copy.outbound}</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            <span className="sr-only">Status</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              name="status"
              defaultValue={status ?? ''}
            >
              <option value="">{copy.all}</option>
              <option value="failed">{copy.failed}</option>
            </select>
          </label>
          <button className="h-9 rounded-md border px-3 text-xs font-medium hover:bg-muted" type="submit">
            {copy.apply}
          </button>
        </form>
        {messages.length === 0 ? (
          <section className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
            {copy.empty}
          </section>
        ) : (
          <ol className="grid gap-3" aria-label="Email threads">
            {threads.map((thread) => {
              const message = thread.at(0)
              if (!message) return null
              const href = recordHref(message)
              return (
                <li className="rounded-xl border bg-card p-4" key={message.threadKey}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{message.subject}</h2>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {message.direction === 'inbound' ? 'From' : 'To'}{' '}
                        {message.direction === 'inbound'
                          ? message.from
                          : message.to.join(', ') || copy.unknownRecipient}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      dateTime={new Date(message.occurredAt).toISOString()}
                    >
                      {format.format(message.occurredAt)} · {messageLabel(message)}
                    </time>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {thread.length} message{thread.length === 1 ? '' : 's'} ·{' '}
                    {message.direction === 'inbound' ? 'Unread' : 'Read'}
                  </p>
                  <details className="mt-3 rounded-md border border-dashed p-3">
                    <summary className="cursor-pointer text-sm font-medium">View conversation</summary>
                    <ol className="mt-3 grid gap-3">
                      {thread.toReversed().map((item) => (
                        <li className="border-t pt-3 first:border-0 first:pt-0" key={item.id}>
                          <p className="text-xs text-muted-foreground">
                            {item.direction === 'inbound' ? item.from : item.to.join(', ') || copy.unknownRecipient} ·{' '}
                            {format.format(item.occurredAt)} · {messageLabel(item)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                            {item.textBody || 'No message body.'}
                          </p>
                          {item.attachments.length === 0 ? null : (
                            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                              {item.attachments.map((attachment) => (
                                <li key={attachment.id}>
                                  <a className="text-primary underline" href={`/api/v1/files/${attachment.id}`}>
                                    {attachment.fileName}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {href === null ? (
                      <span className="text-muted-foreground">{copy.unlinked}</span>
                    ) : (
                      <Link
                        className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={href}
                      >
                        {copy.openRecord}
                      </Link>
                    )}
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

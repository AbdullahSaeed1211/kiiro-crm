import type { EmailThreadMessage } from '../../server/crm/directory/data'

const DATE_FORMAT = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

function replyHref(message: EmailThreadMessage): string | null {
  const recipient = message.direction === 'inbound' ? message.from : message.to[0]
  if (recipient.trim() === '') return null
  const subject = message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`
  const body = `\n\n— Previous message —\n${message.textBody}`
  return `mailto:${recipient}?${new URLSearchParams({ subject, body }).toString()}`
}

function statusLabel(message: EmailThreadMessage): string {
  if (message.status === 'failed') return 'Failed'
  if (message.status === 'queued') return 'Queued'
  if (message.status === 'quarantined') return 'Quarantined'
  return message.direction === 'inbound' ? 'Received' : 'Sent'
}

export function RecordEmailThread({ messages }: Readonly<{ messages: readonly EmailThreadMessage[] }>) {
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="record-email-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="record-email-heading" className="font-medium">
            Email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Inbound and outbound messages linked to this record.</p>
        </div>
        <span className="text-xs text-muted-foreground">{messages.length} messages</span>
      </div>
      {messages.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No email messages yet. Use the Email action above to start a conversation.
        </p>
      ) : (
        <ol className="mt-4 grid gap-3">
          {messages.map((message) => {
            const reply = replyHref(message)
            return (
              <li
                key={message.id}
                className={`rounded-lg border p-3 ${message.direction === 'outbound' ? 'bg-primary/[0.04]' : 'bg-muted/30'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{message.subject}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      {message.direction === 'inbound' ? 'From' : 'To'}{' '}
                      {message.direction === 'inbound' ? message.from : message.to.join(', ') || 'Unknown recipient'}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    dateTime={new Date(message.occurredAt).toISOString()}
                  >
                    {DATE_FORMAT.format(message.occurredAt)} · {statusLabel(message)}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {message.textBody || 'No message body.'}
                </p>
                {reply === null ? null : (
                  <a
                    className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline"
                    href={reply}
                  >
                    {message.direction === 'inbound' ? 'Reply' : 'Email recipient'}
                  </a>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/* eslint-disable max-lines-per-function -- thread header, message cards, and composer stay in one accessible region. */
import type { EmailThreadMessage } from '../../server/crm/directory/data'
import { RecordEmailComposer } from './record-email-composer'
import { formatDate } from '../../i18n/format'
import { EmailReadButton } from './email-read-button'

function statusLabel(message: EmailThreadMessage): string {
  if (message.status === 'failed') return 'Failed'
  if (message.status === 'queued') return 'Queued'
  if (message.status === 'quarantined') return 'Quarantined'
  return message.direction === 'inbound' ? 'Received' : 'Sent'
}

export function RecordEmailThread({
  messages,
  recordType,
  recordId,
  defaultTo,
}: Readonly<{
  messages: readonly EmailThreadMessage[]
  recordType: string
  recordId: string
  defaultTo?: string | null
}>) {
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
      <RecordEmailComposer recordType={recordType} recordId={recordId} defaultTo={defaultTo} />
      {messages.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No email messages yet. Use the Email action above to start a conversation.
        </p>
      ) : (
        <ol className="mt-4 grid gap-3">
          {messages.map((message) => {
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
                    {formatDate(message.occurredAt, undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    })}{' '}
                    · {statusLabel(message)}
                  </time>
                  {message.direction === 'inbound' ? (
                    <EmailReadButton messageId={message.id} initialRead={message.isRead} label="Mark read" />
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {message.textBody || 'No message body.'}
                </p>
                {message.attachments.length === 0 ? null : (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Attachments">
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a className="text-primary underline" href={`/api/v1/files/${attachment.id}`}>
                          {attachment.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

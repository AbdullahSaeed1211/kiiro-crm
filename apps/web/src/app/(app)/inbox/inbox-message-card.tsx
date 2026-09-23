import type { InboxEmailMessage } from '../../../server/crm/directory/types'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import type { Locale } from '../../../i18n/locale'
import { Paperclip } from 'lucide-react'
import { EmailReadButton } from '../email-read-button'
import { displayName, initials, messageDate, messageLabel } from './inbox-model'
import styles from './inbox.module.css'

export function InboxMessageCard({
  message,
  copy,
  locale,
}: Readonly<{ message: InboxEmailMessage; copy: InboxCopy; locale: Locale }>) {
  return (
    <li className={styles.messageCard}>
      <span className={styles.avatar}>{initials(message.from)}</span>
      <article className={styles.messageBody}>
        <header className={styles.messageMeta}>
          <div className={styles.messageIdentity}>
            <strong>{displayName(message.from)}</strong>
            <span>{message.from}</span>
          </div>
          <div className={styles.messageActions}>
            <time dateTime={new Date(message.occurredAt).toISOString()}>
              {messageDate(locale, { timestamp: message.occurredAt, withDate: true })}
            </time>
            {message.direction === 'inbound' && !message.isRead ? (
              <EmailReadButton messageId={message.id} initialRead={false} label={copy.markRead} />
            ) : null}
          </div>
        </header>
        <p className={styles.messageRecipients}>
          {copy.toPrefix} {message.to.join(', ') || copy.unknownRecipient}
          <span className={message.status === 'failed' ? styles.failedStatus : ''}>{messageLabel(message, copy)}</span>
        </p>
        <p className={styles.messageText}>{message.textBody || copy.unlinked}</p>
        {message.attachments.length > 0 ? (
          <ul className={styles.attachmentList}>
            {message.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a href={`/api/v1/files/${attachment.id}`}>
                  <Paperclip size={14} aria-hidden="true" />
                  {attachment.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </li>
  )
}

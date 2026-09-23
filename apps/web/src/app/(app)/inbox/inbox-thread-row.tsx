import type { Locale } from '../../../i18n/locale'
import { Paperclip } from 'lucide-react'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import { displayName, initials, messageDate, messageSender, threadIsUnread, type Thread } from './inbox-model'
import styles from './inbox.module.css'

// eslint-disable-next-line complexity -- row classes and metadata reflect selected, unread, and attachment states.
export function InboxThreadRow({
  thread,
  selected,
  locale,
  copy,
  onSelect,
}: Readonly<{
  thread: Thread
  selected: boolean
  locale: Locale
  copy: InboxCopy
  onSelect: () => void
}>) {
  const message = thread[0]
  const unread = threadIsUnread(thread)
  const sender = messageSender(message, copy.unknownRecipient)
  const preview = message.textBody.replace(/\s+/g, ' ').trim()

  return (
    <button
      aria-current={selected ? 'true' : undefined}
      className={`${styles.threadRow} ${unread ? styles.unreadRow : ''} ${selected ? styles.threadSelected : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className={styles.avatar}>{initials(sender)}</span>
      <span className={styles.threadContent}>
        <span className={styles.threadTopline}>
          <span className={styles.threadSender}>{displayName(sender)}</span>
          <time dateTime={new Date(message.occurredAt).toISOString()}>
            {messageDate(locale, { timestamp: message.occurredAt })}
          </time>
        </span>
        <span className={styles.threadSubject}>
          {message.subject || copy.noSubject}
          {thread.length > 1 ? <span className={styles.threadCount}>{thread.length}</span> : null}
          {message.attachments.length > 0 ? <Paperclip size={13} aria-label={copy.hasAttachments} /> : null}
        </span>
        <span className={styles.threadPreview}>{preview || copy.unlinked}</span>
      </span>
      {unread ? <span className={styles.unreadDot} aria-label={copy.unread} /> : null}
    </button>
  )
}

import type { Locale } from '../../../i18n/locale'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InboxMessageCard } from './inbox-message-card'
import { recordHref, threadIsUnread, type Thread } from './inbox-model'
import styles from './inbox.module.css'
import type { InboxCopy } from '../../../i18n/inbox-copy'

// eslint-disable-next-line complexity -- the two-pane reader has deliberate empty, linked, and mobile-back states.
export function InboxReader({
  thread,
  copy,
  locale,
  onBack,
}: Readonly<{
  thread: Thread | null
  copy: InboxCopy
  locale: Locale
  onBack: () => void
}>) {
  const latest = thread?.[0] ?? null
  const recordLink = latest === null ? null : recordHref(latest)

  return (
    <section className={styles.reader} aria-label="Message content">
      {thread === null || latest === null ? (
        <div className={styles.readerEmpty}>{copy.selectMessage}</div>
      ) : (
        <>
          <div className={styles.readerToolbar}>
            <button className={styles.mobileBack} type="button" onClick={onBack}>
              <ArrowLeft size={17} aria-hidden="true" /> <span>{copy.back}</span>
            </button>
            <span className={styles.messageCount}>
              {thread.length} {thread.length === 1 ? copy.message : copy.messages}
            </span>
            <div className={styles.readerTools}>
              {recordLink === null ? (
                <span className={styles.unlinkedLabel}>{copy.unlinked}</span>
              ) : (
                <Link className={styles.recordLink} href={recordLink}>
                  {copy.openRecord}
                </Link>
              )}
            </div>
          </div>
          <div className={styles.messageScroll}>
            <div className={styles.subjectBlock}>
              <h2>{latest.subject || copy.noSubject}</h2>
              {threadIsUnread(thread) ? <span className={styles.unreadPill}>{copy.unread}</span> : null}
            </div>
            <ol className={styles.messageStack} aria-label="Conversation messages">
              {thread.toReversed().map((message) => (
                <InboxMessageCard key={message.id} message={message} copy={copy} locale={locale} />
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  )
}

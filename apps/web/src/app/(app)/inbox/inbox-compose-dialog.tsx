import { Send, X } from 'lucide-react'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import styles from './inbox.module.css'

export function InboxComposeDialog({
  open,
  outboundEmailEnabled,
  copy,
  onClose,
}: Readonly<{
  open: boolean
  outboundEmailEnabled: boolean
  copy: InboxCopy
  onClose: () => void
}>) {
  if (!open) return null

  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section aria-labelledby="inbox-compose-title" aria-modal="true" className={styles.composeDialog} role="dialog">
        <header>
          <h2 id="inbox-compose-title">{copy.composeTitle}</h2>
          <button aria-label={copy.close} className={styles.closeButton} onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <p className={styles.composeNotice} role="status">
          {outboundEmailEnabled ? copy.composeLinkedOnly : copy.composeUnavailable}
        </p>
        <label>
          {copy.to}
          <input disabled />
        </label>
        <label>
          {copy.subject}
          <input disabled />
        </label>
        <label>
          {copy.messageBody}
          <textarea disabled rows={6} />
        </label>
        <footer>
          <button disabled type="button">
            <Send size={15} aria-hidden="true" />
            {copy.send}
          </button>
        </footer>
      </section>
    </div>
  )
}

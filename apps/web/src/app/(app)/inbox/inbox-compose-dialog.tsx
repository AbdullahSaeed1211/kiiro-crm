'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import styles from './inbox.module.css'
import { readApi } from '../api-client'

/** True for text shaped like name@host.tld; checked by position, not a pattern, so odd input cannot make it slow. */
function looksLikeEmail(text: string): boolean {
  const at = text.indexOf('@')
  const dot = text.lastIndexOf('.')
  return at > 0 && at === text.lastIndexOf('@') && dot > at + 1 && dot < text.length - 1 && !/\s/u.test(text)
}

/** The addresses typed in the To box, split on commas, semicolons and spaces, lower-cased, without repeats. */
function addressesOf(text: string): string[] {
  const parts = text
    .split(/[\s,;]+/u)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(parts)]
}

/** A first name made from the part of an address before the @, such as "Abdullah Saeed" for abdullah.saeed@example.com. */
function nameFromAddress(address: string): string {
  const local = address.split('@')[0] ?? address
  return local
    .split(/[._-]+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** The id of the contact that already has this exact address, or `undefined`. */
async function existingContactId(address: string): Promise<string | undefined> {
  const response = await fetch(`/api/v1/contacts?limit=20&q=${encodeURIComponent(address)}`)
  const result = await readApi<{ records?: readonly { id: string; email?: string | null }[] }>(response, '')
  if (!result.ok) return undefined
  return result.data.records?.find((record) => record.email?.toLowerCase() === address)?.id
}

/** Finds the contact with this address, or adds one, and returns its id. */
async function contactIdFor(address: string): Promise<string | undefined> {
  const existing = await existingContactId(address)
  if (existing !== undefined) return existing
  const response = await fetch('/api/v1/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: nameFromAddress(address), email: address }),
  })
  const result = await readApi<{ id?: string }>(response, '')
  return result.ok ? result.data.id : undefined
}

interface Draft {
  readonly to: string
  readonly subject: string
  readonly message: string
}

/** Sends to any address. The message is kept on the first recipient's contact, which is made if it does not exist. */
async function sendDraft(draft: Draft, copy: InboxCopy): Promise<string> {
  const to = addressesOf(draft.to)
  const [first = ''] = to
  if (to.length === 0 || draft.subject.trim() === '' || draft.message.trim() === '') return copy.composeNeedAll
  if (!to.every(looksLikeEmail)) return copy.composeBadAddress
  const recordId = await contactIdFor(first)
  if (recordId === undefined) return copy.composeSendFailed
  const response = await fetch('/api/v1/email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recordType: 'contact',
      recordId,
      to,
      subject: draft.subject.trim(),
      textBody: draft.message.trim(),
    }),
  })
  const result = await readApi(response, copy.composeSendFailed)
  return result.ok ? '' : result.message
}

function ComposeForm({ copy, onClose }: Readonly<{ copy: InboxCopy; onClose: () => void }>) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>({ to: '', subject: '', message: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const set = (field: keyof Draft) => (event: { target: { value: string } }) => {
    setDraft({ ...draft, [field]: event.target.value })
  }
  const submit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setSending(true)
    const failure = await sendDraft(draft, copy)
    setSending(false)
    setError(failure)
    if (failure !== '') return
    onClose()
    router.refresh()
  }
  return (
    <form
      className={styles.composeForm}
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <label>
        <span>{copy.composeTo}</span>
        <input autoFocus onChange={set('to')} placeholder={copy.composeToPlaceholder} type="text" value={draft.to} />
      </label>
      <label>
        <span>{copy.composeSubject}</span>
        <input onChange={set('subject')} type="text" value={draft.subject} />
      </label>
      <label>
        <span>{copy.composeMessage}</span>
        <textarea onChange={set('message')} rows={8} value={draft.message} />
      </label>
      {error === '' ? null : (
        <p className={styles.composeError} role="alert">
          {error}
        </p>
      )}
      <footer>
        <button disabled={sending} type="submit">
          {sending ? copy.composeSending : copy.composeSend}
        </button>
      </footer>
    </form>
  )
}

/** "Compose" in the inbox: write to anyone with To, Subject and Message. A new address is added as a contact so the message is kept. */
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
          {outboundEmailEnabled ? copy.composeHelp : copy.composeUnavailable}
        </p>
        {outboundEmailEnabled ? <ComposeForm copy={copy} onClose={onClose} /> : null}
      </section>
    </div>
  )
}

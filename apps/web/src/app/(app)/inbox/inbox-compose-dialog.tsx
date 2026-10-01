'use client'

import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import styles from './inbox.module.css'
import { readApi } from '../api-client'

interface Match {
  readonly recordType: string
  readonly id: string
  readonly title: string
  readonly subtitle: string
}

const ROUTES: Readonly<Record<string, string>> = {
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
  organization: 'organizations',
}
const MIN_QUERY = 2

/** True for text shaped like name@host.tld; checked by position, not a pattern, so odd input cannot make it slow. */
function looksLikeEmail(text: string): boolean {
  const at = text.indexOf('@')
  const dot = text.lastIndexOf('.')
  return at > 0 && at === text.lastIndexOf('@') && dot > at + 1 && dot < text.length - 1 && !/\s/u.test(text)
}
const SEARCH_DELAY_MS = 180

async function searchRecords(query: string, signal: AbortSignal): Promise<readonly Match[]> {
  const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, { signal })
  const result = await readApi<{ records?: readonly Match[] }>(response, 'Search failed.')
  return ((result.ok ? result.data.records : undefined) ?? []).filter((match) => match.recordType in ROUTES)
}

/** Records a message can be written from that match the query; empty while the query is too short. */
function useRecordSearch(query: string): { readonly matches: readonly Match[]; readonly loading: boolean } {
  const [matches, setMatches] = useState<readonly Match[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY) {
      setMatches([])
      setLoading(false)
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      searchRecords(trimmed, controller.signal)
        .then(setMatches)
        .catch(() => {
          if (!controller.signal.aborted) setMatches([])
        })
        .finally(() => {
          setLoading(false)
        })
    }, SEARCH_DELAY_MS)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])
  return { matches, loading }
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

/** Adds the address as a contact, or finds the one that has it, and returns the contact's id. */
async function contactIdFor(address: string): Promise<string | undefined> {
  const response = await fetch('/api/v1/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: nameFromAddress(address), email: address }),
  })
  const result = await readApi<{ id?: string }>(response, '')
  return result.ok ? result.data.id : undefined
}

/** Offers to write to an address that is not on any record yet, by adding it as a contact first. */
function WriteToAddress({
  address,
  copy,
  onClose,
}: Readonly<{ address: string; copy: InboxCopy; onClose: () => void }>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const go = async () => {
    setPending(true)
    setFailed(false)
    const id = await contactIdFor(address)
    setPending(false)
    if (id === undefined) {
      setFailed(true)
      return
    }
    onClose()
    router.push(`/contacts/${id}?tab=email`)
  }
  return (
    <li>
      <button
        disabled={pending}
        onClick={() => {
          void go()
        }}
        type="button"
      >
        <strong>{copy.composeWriteTo.replace('{email}', address)}</strong>
        <span>{failed ? copy.composeWriteToFailed : copy.composeWriteToHelp}</span>
      </button>
    </li>
  )
}

/** The records that match the search, plus the offer to write to a typed address that is on no record yet. */
function ComposeResults({
  copy,
  loading,
  matches,
  onClose,
  query,
}: Readonly<{
  copy: InboxCopy
  loading: boolean
  matches: readonly Match[]
  onClose: () => void
  query: string
}>) {
  const address = query.trim().toLowerCase()
  const offersAddress =
    looksLikeEmail(address) &&
    !matches.some(
      (match) => match.title.toLowerCase().includes(address) || match.subtitle.toLowerCase().includes(address),
    )
  return (
    <ul className={styles.composeResults}>
      {offersAddress ? <WriteToAddress address={address} copy={copy} onClose={onClose} /> : null}
      {matches.map((match) => (
        <li key={`${match.recordType}:${match.id}`}>
          <Link href={`/${ROUTES[match.recordType] ?? ''}/${match.id}?tab=email`} onClick={onClose}>
            <strong>{match.title}</strong>
            <span>{match.subtitle === '' ? match.recordType : match.subtitle}</span>
          </Link>
        </li>
      ))}
      {query.trim().length >= MIN_QUERY && matches.length === 0 && !offersAddress ? (
        <li className={styles.composeEmpty}>{loading ? copy.composeSearching : copy.composeNoMatches}</li>
      ) : null}
    </ul>
  )
}

/** "Compose" in the inbox: pick the record to write from, then continue on its Email tab where the message is sent and kept. */
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
  const [query, setQuery] = useState('')
  const { matches, loading } = useRecordSearch(query)
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
        {outboundEmailEnabled ? (
          <>
            <label className={styles.composeSearch}>
              <Search size={15} aria-hidden="true" />
              <input
                autoFocus
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                placeholder={copy.composeSearch}
                value={query}
              />
            </label>
            <ComposeResults copy={copy} loading={loading} matches={matches} onClose={onClose} query={query} />
          </>
        ) : null}
      </section>
    </div>
  )
}

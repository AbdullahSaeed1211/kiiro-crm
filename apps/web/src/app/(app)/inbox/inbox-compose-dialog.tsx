'use client'

import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { InboxCopy } from '../../../i18n/inbox-copy'
import styles from './inbox.module.css'

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
const SEARCH_DELAY_MS = 180

async function searchRecords(query: string, signal: AbortSignal): Promise<readonly Match[]> {
  const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, { signal })
  const data: { results?: readonly Match[] } = await response.json()
  return (data.results ?? []).filter((match) => match.recordType in ROUTES)
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
            <ul className={styles.composeResults}>
              {matches.map((match) => (
                <li key={`${match.recordType}:${match.id}`}>
                  <Link href={`/${ROUTES[match.recordType] ?? ''}/${match.id}?tab=email`} onClick={onClose}>
                    <strong>{match.title}</strong>
                    <span>{match.subtitle === '' ? match.recordType : match.subtitle}</span>
                  </Link>
                </li>
              ))}
              {query.trim().length >= MIN_QUERY && matches.length === 0 ? (
                <li className={styles.composeEmpty}>{loading ? copy.composeSearching : copy.composeNoMatches}</li>
              ) : null}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  )
}

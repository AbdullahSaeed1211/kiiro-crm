/*
 * Copyright (c) 2026 Cloudflare, Inc.
 * Adapted from cloudflare/agentic-inbox at commit 48039bb, including Sidebar,
 * MailboxSplitView, and email-panel presentation. Modified for the CRM's
 * server-provided messages and read-state endpoint. Agent and provider-specific
 * behavior are excluded. Licensed under Apache-2.0; see third_party/agentic-inbox/LICENSE.
 */
'use client'

import type { InboxEmailMessage } from '../../../server/crm/directory/types'
import { INBOX_COPY } from '../../../i18n/inbox-copy'
import type { Locale } from '../../../i18n/locale'
import { InboxComposeDialog } from './inbox-compose-dialog'
import { InboxFolderRail, InboxFolderToggle } from './inbox-folder-rail'
import { InboxReader } from './inbox-reader'
import { InboxThreadRow } from './inbox-thread-row'
import { folderLabel, groupThreads, threadIsUnread, type Folder, type Thread } from './inbox-model'
import { Archive, AlertCircle, FileText, Inbox as InboxIcon, Mail, Search, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import styles from './inbox.module.css'

function matchesFolder(thread: Thread, folder: Folder): boolean {
  if (folder === 'inbox') return thread.some((message) => message.direction === 'inbound')
  if (folder === 'sent') return thread.some((message) => message.direction === 'outbound')
  if (folder === 'failed') return thread.some((message) => message.status === 'failed')
  return true
}

function filterThreads({
  threads,
  folder,
  query,
}: Readonly<{ threads: readonly Thread[]; folder: Folder; query: string }>): Thread[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return threads.filter(
    (thread) =>
      matchesFolder(thread, folder) &&
      (normalizedQuery === '' ||
        thread.some((message) =>
          [message.subject, message.from, ...message.to, message.textBody].some((value) =>
            value.toLocaleLowerCase().includes(normalizedQuery),
          ),
        )),
  )
}

// eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity -- the client composes the mail workspace panels and owns shared selection state.
export function InboxClient({
  messages,
  locale,
  initialFolder,
  outboundEmailEnabled,
}: Readonly<{
  messages: readonly InboxEmailMessage[]
  locale: Locale
  initialFolder: Folder
  outboundEmailEnabled: boolean
}>) {
  const copy = INBOX_COPY[locale]
  const threads = useMemo(() => groupThreads(messages), [messages])
  const [folder, setFolder] = useState<Folder>(initialFolder)
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(messages.length > 0 ? messages[0].threadKey : null)
  const [mobileReader, setMobileReader] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(true)

  useEffect(() => {
    if (!composeOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setComposeOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [composeOpen])

  const unreadCount = threads.filter(threadIsUnread).length
  const sentCount = threads.filter((thread) => thread.some((message) => message.direction === 'outbound')).length
  const failedCount = threads.filter((thread) => thread.some((message) => message.status === 'failed')).length
  const inboxCount = threads.filter((thread) => thread.some((message) => message.direction === 'inbound')).length
  const visibleThreads = filterThreads({ threads, folder, query })
  const selectedThread =
    visibleThreads.find((thread) => thread[0].threadKey === selectedKey) ?? visibleThreads.at(0) ?? null
  const folders: readonly { id: Folder; icon: typeof InboxIcon; count: number }[] = [
    { id: 'inbox', icon: InboxIcon, count: inboxCount },
    { id: 'sent', icon: Send, count: sentCount },
    { id: 'failed', icon: AlertCircle, count: failedCount },
    { id: 'all', icon: Archive, count: threads.length },
  ]

  return (
    <section className={`${styles.workspace} ${foldersOpen ? '' : styles.foldersClosed}`} aria-label={copy.title}>
      {foldersOpen ? (
        <InboxFolderRail
          copy={copy}
          folders={folders}
          activeFolder={folder}
          unreadCount={unreadCount}
          onClose={() => {
            setFoldersOpen(false)
          }}
          onCompose={() => {
            setComposeOpen(true)
          }}
          onSelect={(selectedFolder) => {
            setFolder(selectedFolder)
            setMobileReader(false)
          }}
        />
      ) : null}

      <div className={styles.mailArea}>
        <header className={styles.toolbar}>
          {!foldersOpen ? (
            <InboxFolderToggle
              copy={copy}
              onOpen={() => {
                setFoldersOpen(true)
              }}
            />
          ) : null}
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">{copy.search}</span>
            <input
              aria-label={copy.search}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={query}
            />
            <kbd>/</kbd>
          </label>
          <div className={styles.toolbarActions}>
            <button
              className={styles.mobileCompose}
              onClick={() => {
                setComposeOpen(true)
              }}
              type="button"
            >
              <FileText size={16} aria-hidden="true" />
              {copy.compose}
            </button>
            <Link
              className={styles.settingsLink}
              href="/settings/email"
              aria-label="Email settings"
              title="Email settings"
            >
              <Mail size={17} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div
          className={`${styles.contentGrid} ${selectedThread === null ? styles.contentEmpty : ''} ${mobileReader ? styles.mobileReading : ''}`}
        >
          <section className={styles.threadList} aria-label={folderLabel(folder, copy)}>
            <div className={styles.listHeading}>
              <div>
                <h1>{folderLabel(folder, copy)}</h1>
                <p>
                  {visibleThreads.length} {visibleThreads.length === 1 ? copy.message : copy.messages}
                </p>
              </div>
              {unreadCount > 0 ? (
                <span className={styles.unreadPill}>
                  {unreadCount} {copy.unread}
                </span>
              ) : null}
            </div>
            <div className={styles.threadRows}>
              {visibleThreads.length === 0 ? (
                <div className={styles.emptyState} role="status" aria-live="polite">
                  <span className={styles.emptyStateIcon} aria-hidden="true">
                    {query.trim() ? <Search size={20} /> : <InboxIcon size={20} />}
                  </span>
                  <div className={styles.emptyStateCopy}>
                    <h2>{query.trim() ? copy.noMatches : copy.noMessages}</h2>
                    {query.trim() ? null : <p>{copy.emptyInboxHint}</p>}
                  </div>
                </div>
              ) : (
                visibleThreads.map((thread) => (
                  <InboxThreadRow
                    key={thread[0].threadKey}
                    thread={thread}
                    selected={selectedThread?.[0].threadKey === thread[0].threadKey}
                    locale={locale}
                    copy={copy}
                    onSelect={() => {
                      setSelectedKey(thread[0].threadKey)
                      setMobileReader(true)
                    }}
                  />
                ))
              )}
            </div>
          </section>

          {selectedThread === null ? null : (
            <InboxReader
              thread={selectedThread}
              copy={copy}
              locale={locale}
              onBack={() => {
                setMobileReader(false)
              }}
            />
          )}
        </div>
      </div>

      <InboxComposeDialog
        open={composeOpen}
        outboundEmailEnabled={outboundEmailEnabled}
        copy={copy}
        onClose={() => {
          setComposeOpen(false)
        }}
      />
    </section>
  )
}

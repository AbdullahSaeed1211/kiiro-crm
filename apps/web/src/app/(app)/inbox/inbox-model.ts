import type { InboxEmailMessage } from '../../../server/crm/directory/types'
import type { Locale } from '../../../i18n/locale'
import type { InboxCopy } from '../../../i18n/inbox-copy'

export type Folder = 'inbox' | 'sent' | 'failed' | 'all'
export type Thread = readonly InboxEmailMessage[]
const RECORD_ROUTES: Readonly<Record<string, string | undefined>> = {
  contact: 'contacts',
  deal: 'deals',
  lead: 'leads',
  organization: 'organizations',
  project: 'projects',
}

export function groupThreads(messages: readonly InboxEmailMessage[]): Thread[] {
  const groups = new Map<string, InboxEmailMessage[]>()
  for (const message of messages) {
    const current = groups.get(message.threadKey) ?? []
    current.push(message)
    groups.set(message.threadKey, current)
  }
  return [...groups.values()]
}

export function threadIsUnread(thread: Thread): boolean {
  return thread.some((message) => message.direction === 'inbound' && !message.isRead)
}

export function messageLabel(message: InboxEmailMessage, copy: InboxCopy): string {
  if (message.direction === 'inbound') return copy.receivedStatus
  if (message.status === 'failed') return copy.failedStatus
  if (message.status === 'queued') return copy.queuedStatus
  return copy.sentStatus
}

export function displayName(email: string): string {
  const local = email.trim().split('@')[0]
  return local ? local.replace(/[._-]+/g, ' ') : email
}

export function initials(email: string): string {
  const name = displayName(email).trim().split(/\s+/)
  return `${name[0]?.[0] ?? '?'}${name.length > 1 ? (name.at(-1)?.[0] ?? '') : ''}`.toUpperCase()
}

export function recordHref(message: InboxEmailMessage): string | null {
  if (message.recordId === null) return null
  const route = RECORD_ROUTES[message.recordType ?? '']
  return route === undefined ? null : `/${route}/${message.recordId}`
}

export function messageDate(
  locale: Locale,
  { timestamp, withDate = false }: Readonly<{ timestamp: number; withDate?: boolean }>,
): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    ...(withDate ? { month: 'short', day: 'numeric' } : { hour: 'numeric', minute: '2-digit' }),
    ...(withDate ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(timestamp)
}

export function messageSender(message: InboxEmailMessage, unknownRecipient: string): string {
  return message.direction === 'inbound' ? message.from : message.to.join(', ') || unknownRecipient
}

export function folderLabel(folder: Folder, copy: InboxCopy): string {
  if (folder === 'inbox') return copy.inboxFolder
  if (folder === 'sent') return copy.sentFolder
  if (folder === 'failed') return copy.failedFolder
  return copy.allFolder
}

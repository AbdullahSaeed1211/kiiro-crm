import type { EmailThreadMessage } from './types'

export function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
export function refId(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value !== null && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
function attachment(value: unknown): { readonly id: string; readonly fileName: string } | null {
  if (typeof value === 'string') return { id: value, fileName: value }
  const entry = record(value)
  if (entry === null) return null
  const id = text(entry.id)
  if (id === null) return null
  return { id, fileName: text(entry.fileName) ?? id }
}

function attachmentList(value: unknown): { readonly id: string; readonly fileName: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const item = attachment(entry)
    return item === null ? [] : [item]
  })
}

type Envelope = Pick<EmailThreadMessage, 'direction' | 'status' | 'from' | 'occurredAt'>

const EMAIL_STATUSES = new Set(['queued', 'sent', 'failed', 'received', 'quarantined'])

/** The direction, status, sender and time every stored message must have, or null for a malformed row. */
function messageEnvelope(value: Record<string, unknown>): Envelope | null {
  const { direction, status } = value
  const from = text(value.from)
  const occurredAt = typeof value.occurredAt === 'number' ? value.occurredAt : Date.parse(text(value.createdAt) ?? '')
  const wellFormed =
    (direction === 'inbound' || direction === 'outbound') &&
    EMAIL_STATUSES.has(String(status)) &&
    from !== null &&
    Number.isFinite(occurredAt)
  return wellFormed ? { direction, status: status as Envelope['status'], from, occurredAt } : null
}

const threadKeyOf = (value: Record<string, unknown>, subject: string): string =>
  text(value.inReplyTo) ?? text(value.messageId) ?? text(value.id) ?? subject.trim().toLowerCase()

/** Whether the viewer has read the message; the sender's own messages always count as read. */
function isReadBy(value: Record<string, unknown>, direction: string, viewerId: string | undefined): boolean {
  return direction === 'outbound' || (viewerId !== undefined && textList(value.readBy).includes(viewerId))
}

/** Normalizes one stored email row for the thread view, keeping malformed persisted mail out of the UI. */
export function emailMessage(value: Record<string, unknown>, viewerId?: string): EmailThreadMessage | null {
  const envelope = messageEnvelope(value)
  if (envelope === null) return null
  const subject = text(value.subject) ?? '(no subject)'
  return {
    id: text(value.id) ?? '',
    ...envelope,
    to: textList(value.to),
    subject,
    textBody: text(value.textBody) ?? '',
    threadKey: threadKeyOf(value, subject),
    isRead: isReadBy(value, envelope.direction, viewerId),
    attachments: attachmentList(value.attachments),
  }
}

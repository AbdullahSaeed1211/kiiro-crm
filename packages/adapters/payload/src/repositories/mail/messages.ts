import type { EmailMessage } from '@ops/module-mail'
import { fieldOf, idOf, idsOf, numberOf, textOf, type Doc } from '../documents'

const STATUSES: ReadonlySet<string> = new Set(['queued', 'sent', 'failed', 'received', 'quarantined'])

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const isDirection = (value: string | undefined): value is EmailMessage['direction'] =>
  value === 'inbound' || value === 'outbound'

type RequiredFields = Pick<EmailMessage, 'id' | 'direction' | 'messageId' | 'from' | 'occurredAt' | 'status'>

/** The fields a stored message cannot be read without; `undefined` when any is missing or invalid. */
function requiredFields(doc: Doc): RequiredFields | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const direction = textOf(doc, 'direction')
  const messageId = textOf(doc, 'messageId')
  const from = textOf(doc, 'from')
  const occurredAt = numberOf(doc, 'occurredAt')
  const status = textOf(doc, 'status') ?? ''
  if (id === undefined || messageId === undefined || from === undefined || occurredAt === null) return undefined
  if (!isDirection(direction) || !STATUSES.has(status)) return undefined
  return { id, direction, messageId, from, occurredAt, status: status as EmailMessage['status'] }
}

function optionalFields(doc: Doc): Partial<Pick<EmailMessage, 'record' | 'inReplyTo' | 'htmlFileKey' | 'error'>> {
  const recordType = textOf(doc, 'recordType')
  const recordId = textOf(doc, 'recordId')
  const inReplyTo = textOf(doc, 'inReplyTo')
  const htmlFileKey = textOf(doc, 'htmlFileKey')
  const error = textOf(doc, 'error')
  return {
    ...(recordType === undefined || recordId === undefined ? {} : { record: { type: recordType, id: recordId } }),
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
    ...(htmlFileKey === undefined ? {} : { htmlFileKey }),
    ...(error === undefined ? {} : { error }),
  }
}

/** Reads a stored email message; `undefined` for a document that is missing a required field. */
export function mailMessage(doc: Doc): EmailMessage | undefined {
  const required = requiredFields(doc)
  if (required === undefined) return undefined
  const { id, direction, messageId, from, occurredAt, status } = required
  const optional = optionalFields(doc)
  return {
    id,
    direction,
    ...(optional.record === undefined ? {} : { record: optional.record }),
    messageId,
    ...(optional.inReplyTo === undefined ? {} : { inReplyTo: optional.inReplyTo }),
    from,
    to: textList(fieldOf(doc, 'to')),
    cc: textList(fieldOf(doc, 'cc')),
    subject: textOf(doc, 'subject') ?? '',
    textBody: textOf(doc, 'textBody') ?? '',
    ...(optional.htmlFileKey === undefined ? {} : { htmlFileKey: optional.htmlFileKey }),
    attachmentIds: idsOf(fieldOf(doc, 'attachments')),
    status,
    ...(optional.error === undefined ? {} : { error: optional.error }),
    occurredAt,
  }
}

/** The document data stored for a message. */
export function messageData(message: Omit<EmailMessage, 'id'>): Record<string, unknown> {
  return {
    direction: message.direction,
    ...(message.record === undefined ? {} : { recordType: message.record.type, recordId: message.record.id }),
    messageId: message.messageId,
    ...(message.inReplyTo === undefined ? {} : { inReplyTo: message.inReplyTo }),
    from: message.from,
    to: [...message.to],
    cc: [...message.cc],
    subject: message.subject,
    textBody: message.textBody,
    ...(message.htmlFileKey === undefined ? {} : { htmlFileKey: message.htmlFileKey }),
    attachments: [...message.attachmentIds],
    status: message.status,
    ...(message.error === undefined ? {} : { error: message.error }),
    occurredAt: message.occurredAt,
  }
}

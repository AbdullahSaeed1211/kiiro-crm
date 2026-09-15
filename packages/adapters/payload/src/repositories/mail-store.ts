/* eslint-disable complexity, max-lines, max-lines-per-function -- the Payload mail port coordinates several record types and side effects. */
import { domainError, err, ok } from '@ops/kernel'
import type { EmailMessage, MailRecordRef, MailStore } from '@ops/module-mail'
import type { Payload, Where } from 'payload'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../contracts/names'
import { fieldOf, idOf, idsOf, numberOf, textOf, type Doc } from './documents'
import { insertUnique } from './unique-insert'

type RecordType = (typeof RECORD_TYPES)[keyof typeof RECORD_TYPES]

const RECORD_COLLECTIONS: readonly [RecordType, string][] = [
  [RECORD_TYPES.organizations, COLLECTIONS.organizations],
  [RECORD_TYPES.projects, COLLECTIONS.projects],
  [RECORD_TYPES.tasks, COLLECTIONS.tasks],
  [RECORD_TYPES.contacts, COLLECTIONS.contacts],
  [RECORD_TYPES.leads, COLLECTIONS.leads],
  [RECORD_TYPES.deals, COLLECTIONS.deals],
]

interface MailPayload {
  find(options: Readonly<Record<string, unknown>>): Promise<{ readonly docs: readonly Doc[] }>
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
  update(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

const loose = (payload: object): MailPayload => payload as MailPayload

const asRecord = (type: RecordType, doc: Doc): MailRecordRef | undefined => {
  const id = idOf(fieldOf(doc, 'id'))
  return id === undefined ? undefined : { type, id }
}

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function mailMessage(doc: Doc): EmailMessage | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const direction = textOf(doc, 'direction')
  const messageId = textOf(doc, 'messageId')
  const from = textOf(doc, 'from')
  const occurredAt = numberOf(doc, 'occurredAt')
  const status = textOf(doc, 'status')
  if (
    id === undefined ||
    (direction !== 'inbound' && direction !== 'outbound') ||
    messageId === undefined ||
    from === undefined ||
    occurredAt === null ||
    !['queued', 'sent', 'failed', 'received', 'quarantined'].includes(status ?? '')
  )
    return undefined
  const recordType = textOf(doc, 'recordType')
  const recordId = textOf(doc, 'recordId')
  const record = recordType !== undefined && recordId !== undefined ? { type: recordType, id: recordId } : undefined
  const inReplyTo = textOf(doc, 'inReplyTo')
  const htmlFileKey = textOf(doc, 'htmlFileKey')
  const error = textOf(doc, 'error')
  return {
    id,
    direction,
    ...(record === undefined ? {} : { record }),
    messageId,
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
    from,
    to: textList(fieldOf(doc, 'to')),
    cc: textList(fieldOf(doc, 'cc')),
    subject: textOf(doc, 'subject') ?? '',
    textBody: textOf(doc, 'textBody') ?? '',
    ...(htmlFileKey === undefined ? {} : { htmlFileKey }),
    attachmentIds: idsOf(fieldOf(doc, 'attachments')),
    status: status as EmailMessage['status'],
    ...(error === undefined ? {} : { error }),
    occurredAt,
  }
}

function messageData(message: Omit<EmailMessage, 'id'>): Record<string, unknown> {
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

async function findOne(payload: Payload, collection: string, where: Where): Promise<Doc | undefined> {
  const result = await loose(payload).find({
    collection,
    where,
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs[0]
}

async function findRecord(payload: Payload, record: MailRecordRef): Promise<Doc | undefined> {
  const collection = RECORD_COLLECTIONS.find(([type]) => type === record.type)?.[1]
  return collection === undefined ? undefined : findOne(payload, collection, { id: { equals: record.id } })
}

function idsToNotify(doc: Doc, type: string): string[] {
  const owner = idOf(fieldOf(doc, FIELDS.owner))
  const assignees = idsOf(fieldOf(doc, FIELDS.assignees))
  const members = type === RECORD_TYPES.projects ? idsOf(fieldOf(doc, 'members')) : []
  return [...new Set([...(owner === undefined ? [] : [owner]), ...assignees, ...members])]
}

// The token is not persisted; this bounded adapter scan is the verification boundary for HMAC addresses.
async function findRecordByAddressToken(
  payload: Payload,
  token: string,
  recordAddress: (record: MailRecordRef) => Promise<string>,
): Promise<MailRecordRef | undefined> {
  const pages = await Promise.all(
    RECORD_COLLECTIONS.map(([, collection]) =>
      loose(payload).find({ collection, where: {}, limit: 0, pagination: false, depth: 0, overrideAccess: true }),
    ),
  )
  for (const [index, [type]] of RECORD_COLLECTIONS.entries()) {
    for (const doc of pages[index]?.docs ?? []) {
      const record = asRecord(type, doc)
      if (record === undefined) continue
      const address = await recordAddress(record)
      const local = address.split('@')[0] ?? ''
      const marker = local.lastIndexOf('r-')
      if (marker >= 0 && local.slice(marker + 2).toLowerCase() === token.toLowerCase()) return record
    }
  }
  return undefined
}

// Deal sender verification traverses its contact relation; the other records use their direct email field.
async function senderMatchesRecord(payload: Payload, sender: string, record: MailRecordRef): Promise<boolean> {
  const normalized = sender.trim().toLowerCase()
  if (normalized === '') return false
  const doc = await findRecord(payload, record)
  if (doc === undefined) return false
  if (record.type === RECORD_TYPES.deals) {
    const contactIds = idsOf(fieldOf(doc, 'contacts'))
    if (contactIds.length === 0) return false
    const contacts = await loose(payload).find({
      collection: COLLECTIONS.contacts,
      where: { and: [{ id: { in: contactIds } }, { email: { equals: normalized } }] },
      limit: 1,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    return contacts.docs.length > 0
  }
  if (
    record.type !== RECORD_TYPES.organizations &&
    record.type !== RECORD_TYPES.contacts &&
    record.type !== RECORD_TYPES.leads
  )
    return false
  return textOf(doc, 'email')?.trim().toLowerCase() === normalized
}

async function addActivityIfAbsent(payload: Payload, input: Parameters<MailStore['addActivityIfAbsent']>[0]) {
  const existing = await loose(payload).find({
    collection: COLLECTIONS.activity,
    where: {
      and: [
        { recordType: { equals: input.record.type } },
        { recordId: { equals: input.record.id } },
        { verb: { equals: input.verb } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (
    existing.docs.some((doc) => {
      const data = fieldOf(doc, 'data')
      return typeof data === 'object' && data !== null && Reflect.get(data, 'messageId') === input.messageId
    })
  )
    return 'duplicate' as const
  await loose(payload).create({
    collection: COLLECTIONS.activity,
    data: {
      recordType: input.record.type,
      recordId: input.record.id,
      verb: input.verb,
      data: { messageId: input.messageId },
      occurredAt: input.occurredAt,
    },
    depth: 0,
    overrideAccess: true,
  })
  return 'created' as const
}

async function notifyIfAbsent(payload: Payload, input: Parameters<MailStore['notifyIfAbsent']>[0]) {
  const doc = await findRecord(payload, input.record)
  if (doc === undefined) return 'duplicate' as const
  const users = idsToNotify(doc, input.record.type)
  let created = false
  for (const user of users) {
    const dedupeKey = `${input.record.type}:${input.record.id}:email_received:${input.messageId}:${user}`
    const result = await insertUnique(payload, {
      collection: COLLECTIONS.notifications,
      field: 'dedupeKey',
      value: dedupeKey,
      data: {
        user,
        type: input.type,
        recordType: input.record.type,
        recordId: input.record.id,
        data: { messageId: input.messageId },
        dedupeKey,
      },
    })
    created ||= result === 'created'
  }
  return created ? ('created' as const) : ('duplicate' as const)
}

/** Payload Local API implementation of the mail domain's persistence port. */
export function createMailStore(
  payload: Payload,
  recordAddress: (record: MailRecordRef) => Promise<string>,
): MailStore {
  return {
    findMessageByMessageId: async (messageId) => {
      const doc = await findOne(payload, COLLECTIONS.emailMessages, { messageId: { equals: messageId } })
      return doc === undefined ? undefined : mailMessage(doc)
    },
    createMessage: async (message) => {
      await insertUnique(payload, {
        collection: COLLECTIONS.emailMessages,
        field: 'messageId',
        value: message.messageId,
        data: messageData(message),
      })
      const doc = await findOne(payload, COLLECTIONS.emailMessages, { messageId: { equals: message.messageId } })
      const saved = doc === undefined ? undefined : mailMessage(doc)
      if (saved === undefined) throw new Error('email message create returned an incomplete document')
      return saved
    },
    findRecordByAddressToken: (token) => findRecordByAddressToken(payload, token, recordAddress),
    findIntakeFormByAlias: async (alias) => {
      const doc = await findOne(payload, COLLECTIONS.intakeForms, {
        and: [{ emailAlias: { equals: alias } }, { active: { equals: true } }],
      })
      if (doc === undefined) return undefined
      const id = idOf(fieldOf(doc, 'id'))
      return id === undefined ? undefined : { id, active: fieldOf(doc, 'active') === true }
    },
    senderMatchesRecord: (sender, record) => senderMatchesRecord(payload, sender, record),
    senderMatchesActiveUser: async (sender) => {
      const normalized = sender.trim().toLowerCase()
      if (normalized === '') return false
      const result = await loose(payload).find({
        collection: COLLECTIONS.users,
        where: { and: [{ email: { equals: normalized } }, { active: { equals: true } }] },
        limit: 1,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      return result.docs.length > 0
    },
    addActivityIfAbsent: (input) => addActivityIfAbsent(payload, input),
    notifyIfAbsent: (input) => notifyIfAbsent(payload, input),
    releaseMessage: async (messageId, record) => {
      const existing = await findOne(payload, COLLECTIONS.emailMessages, { messageId: { equals: messageId } })
      if (existing === undefined) return err(domainError('NOT_FOUND', 'email message not found'))
      if (textOf(existing, 'status') !== 'quarantined')
        return err(domainError('ALREADY_DONE', 'email message is not quarantined'))
      await loose(payload).update({
        collection: COLLECTIONS.emailMessages,
        id: String(fieldOf(existing, 'id')),
        data: { recordType: record.type, recordId: record.id, status: 'received' },
        depth: 0,
        overrideAccess: true,
      })
      return ok(undefined)
    },
  }
}

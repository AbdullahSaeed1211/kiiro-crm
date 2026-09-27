import type { MailStore } from '@ops/module-mail'
import type { Payload } from 'payload'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../../contracts/names'
import { fieldOf, idOf, idsOf, type Doc } from '../documents'
import { insertUnique } from '../unique-insert'
import { findRecord, loose } from './shared'

type ActivityInput = Parameters<MailStore['addActivityIfAbsent']>[0]
type NotifyInput = Parameters<MailStore['notifyIfAbsent']>[0]

function idsToNotify(doc: Doc, type: string): string[] {
  const owner = idOf(fieldOf(doc, FIELDS.owner))
  const assignees = idsOf(fieldOf(doc, FIELDS.assignees))
  const members = type === RECORD_TYPES.projects ? idsOf(fieldOf(doc, 'members')) : []
  return [...new Set([...(owner === undefined ? [] : [owner]), ...assignees, ...members])]
}

async function activityExists(payload: Payload, input: ActivityInput): Promise<boolean> {
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
  return existing.docs.some((doc) => {
    const data = fieldOf(doc, 'data')
    return typeof data === 'object' && data !== null && Reflect.get(data, 'messageId') === input.messageId
  })
}

/** Records the email activity once per message id on its record. */
export async function addActivityIfAbsent(payload: Payload, input: ActivityInput) {
  if (await activityExists(payload, input)) return 'duplicate' as const
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

/** Notifies the record's owner, assignees and project members once per message. */
export async function notifyIfAbsent(payload: Payload, input: NotifyInput) {
  const doc = await findRecord(payload, input.record)
  if (doc === undefined) return 'duplicate' as const
  let created = false
  for (const user of idsToNotify(doc, input.record.type)) {
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

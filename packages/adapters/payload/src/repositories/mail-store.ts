import { domainError, err, ok } from '@ops/kernel'
import type { MailRecordRef, MailStore } from '@ops/module-mail'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, textOf } from './documents'
import { messageData, mailMessage } from './mail/messages'
import { addActivityIfAbsent, notifyIfAbsent } from './mail/notifications'
import { scanRecordsForAddressToken, senderMatchesRecord } from './mail/records'
import { findOne, loose } from './mail/shared'
import { insertUnique } from './unique-insert'

type MessageOps = Pick<MailStore, 'findMessageByMessageId' | 'createMessage' | 'releaseMessage'>

function messageOps(payload: Payload): MessageOps {
  const byMessageId = (messageId: string) =>
    findOne(payload, COLLECTIONS.emailMessages, { messageId: { equals: messageId } })
  return {
    findMessageByMessageId: async (messageId) => {
      const doc = await byMessageId(messageId)
      return doc === undefined ? undefined : mailMessage(doc)
    },
    createMessage: async (message) => {
      await insertUnique(payload, {
        collection: COLLECTIONS.emailMessages,
        field: 'messageId',
        value: message.messageId,
        data: messageData(message),
      })
      const doc = await byMessageId(message.messageId)
      const saved = doc === undefined ? undefined : mailMessage(doc)
      if (saved === undefined) throw new Error('email message create returned an incomplete document')
      return saved
    },
    releaseMessage: async (messageId, record) => {
      const existing = await byMessageId(messageId)
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

async function findIntakeFormByAlias(payload: Payload, alias: string) {
  const doc = await findOne(payload, COLLECTIONS.intakeForms, {
    and: [{ emailAlias: { equals: alias } }, { active: { equals: true } }],
  })
  if (doc === undefined) return undefined
  const id = idOf(fieldOf(doc, 'id'))
  return id === undefined ? undefined : { id, active: fieldOf(doc, 'active') === true }
}

async function senderMatchesActiveUser(payload: Payload, sender: string): Promise<boolean> {
  const normalized = sender.trim().toLowerCase()
  if (normalized === '') return false
  const user = await findOne(payload, COLLECTIONS.users, {
    and: [{ email: { equals: normalized } }, { active: { equals: true } }],
  })
  return user !== undefined
}

/** Payload Local API implementation of the mail domain's persistence port. */
export function createMailStore(
  payload: Payload,
  recordAddress: (record: MailRecordRef) => Promise<string>,
): MailStore {
  return {
    ...messageOps(payload),
    findRecordByAddressToken: (token) => scanRecordsForAddressToken(payload, token, recordAddress),
    findIntakeFormByAlias: (alias) => findIntakeFormByAlias(payload, alias),
    senderMatchesRecord: (sender, record) => senderMatchesRecord(payload, sender, record),
    senderMatchesActiveUser: (sender) => senderMatchesActiveUser(payload, sender),
    addActivityIfAbsent: (input) => addActivityIfAbsent(payload, input),
    notifyIfAbsent: (input) => notifyIfAbsent(payload, input),
  }
}

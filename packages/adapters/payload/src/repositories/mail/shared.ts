import type { MailRecordRef } from '@ops/module-mail'
import type { Payload, Where } from 'payload'
import { MAILABLE_RECORDS } from '../../contracts/names'
import type { Doc } from '../documents'

/** The Local API surface the mail store uses, typed loosely because it spans several collections. */
export interface MailPayload {
  find(options: Readonly<Record<string, unknown>>): Promise<{ readonly docs: readonly Doc[] }>
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
  update(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

export const loose = (payload: object): MailPayload => payload as MailPayload

export type MailableRecord = (typeof MAILABLE_RECORDS)[number]

export const mailableRecord = (type: string): MailableRecord | undefined =>
  MAILABLE_RECORDS.find((entry) => entry.type === type)

export async function findOne(payload: Payload, collection: string, where: Where): Promise<Doc | undefined> {
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

export async function findRecord(payload: Payload, record: MailRecordRef): Promise<Doc | undefined> {
  const collection = mailableRecord(record.type)?.collection
  return collection === undefined ? undefined : findOne(payload, collection, { id: { equals: record.id } })
}

import type { MailRecordRef } from '@ops/module-mail'
import type { Payload } from 'payload'
import { COLLECTIONS, MAILABLE_RECORDS } from '../../contracts/names'
import { fieldOf, idOf, idsOf, textOf, type Doc } from '../documents'
import { findRecord, loose, mailableRecord } from './shared'

function addressToken(address: string): string | undefined {
  const local = address.split('@')[0] ?? ''
  const marker = local.lastIndexOf('r-')
  return marker < 0 ? undefined : local.slice(marker + 2).toLowerCase()
}

/**
 * Finds the record a reply address points at. The HMAC token is not stored, so this reads every mailable record
 * and recomputes its address: cost grows with the number of records, and it is the only check that the token is
 * genuine.
 */
export async function scanRecordsForAddressToken(
  payload: Payload,
  token: string,
  recordAddress: (record: MailRecordRef) => Promise<string>,
): Promise<MailRecordRef | undefined> {
  const wanted = token.toLowerCase()
  const pages = await Promise.all(
    MAILABLE_RECORDS.map(({ collection }) =>
      loose(payload).find({ collection, where: {}, limit: 0, pagination: false, depth: 0, overrideAccess: true }),
    ),
  )
  for (const [index, { type }] of MAILABLE_RECORDS.entries()) {
    for (const doc of pages[index]?.docs ?? []) {
      const id = idOf(fieldOf(doc, 'id'))
      if (id === undefined) continue
      if (addressToken(await recordAddress({ type, id })) === wanted) return { type, id }
    }
  }
  return undefined
}

async function linkedContactHasEmail(payload: Payload, doc: Doc, email: string): Promise<boolean> {
  const contactIds = idsOf(fieldOf(doc, 'contacts'))
  if (contactIds.length === 0) return false
  const contacts = await loose(payload).find({
    collection: COLLECTIONS.contacts,
    where: { and: [{ id: { in: contactIds } }, { email: { equals: email } }] },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return contacts.docs.length > 0
}

/** True when an inbound sender belongs to the record, using the record type's rule in `MAILABLE_RECORDS`. */
export async function senderMatchesRecord(payload: Payload, sender: string, record: MailRecordRef): Promise<boolean> {
  const normalized = sender.trim().toLowerCase()
  const rule = mailableRecord(record.type)?.sender ?? 'none'
  if (normalized === '' || rule === 'none') return false
  const doc = await findRecord(payload, record)
  if (doc === undefined) return false
  if (rule === 'contacts') return linkedContactHasEmail(payload, doc, normalized)
  return textOf(doc, 'email')?.trim().toLowerCase() === normalized
}

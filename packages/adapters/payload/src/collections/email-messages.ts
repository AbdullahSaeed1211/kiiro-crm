import { COLLECTIONS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  epochMs,
  hasManyTo,
  recordReference,
  selectOf,
  spikeCollection,
  stringListField,
  textField,
} from './fields'
import { EMAIL_DIRECTION_VALUES, EMAIL_STATUS_VALUES } from './values'

// Spec §10.4 caps the plain-text body at 200 KB; the field limit counts characters.
const EMAIL_TEXT_BODY_MAX = 200_000

/** Sent and received emails (spec §10.4); a duplicate `messageId` is rejected so inbound mail is stored once. */
export const emailMessagesCollection = spikeCollection({
  slug: COLLECTIONS.emailMessages,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'subject', defaultColumns: ['subject', 'direction', 'status'] },
  fields: [
    selectOf('direction', EMAIL_DIRECTION_VALUES, { required: true }),
    ...recordReference(),
    textField('messageId', { required: true, unique: true, index: true, maxLength: 998 }),
    textField('inReplyTo', { maxLength: 998 }),
    textField('from', { required: true, maxLength: 320 }),
    stringListField('to'),
    stringListField('cc'),
    textField('subject', { maxLength: 998 }),
    { name: 'textBody', type: 'textarea', maxLength: EMAIL_TEXT_BODY_MAX },
    // Object key of the HTML body in file storage; bodies are too large for a D1 row.
    textField('htmlFileKey', { maxLength: 500 }),
    hasManyTo('attachments', COLLECTIONS.attachments),
    selectOf('status', EMAIL_STATUS_VALUES, { required: true }),
    textField('error', { maxLength: 2000 }),
    epochMs('occurredAt', { required: true }),
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'occurredAt'] }],
})

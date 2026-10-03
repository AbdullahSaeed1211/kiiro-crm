import { COLLECTIONS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  currencyField,
  epochMs,
  jsonField,
  minorUnitsField,
  relationshipTo,
  selectOf,
  spikeCollection,
  textField,
} from './fields'

const BILLING_KINDS = ['quote', 'invoice'] as const
const BILLING_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'paid', 'void'] as const

/** Quotes and invoices. The number is unique, so two documents made at once cannot share one. */
export const billingDocumentsCollection = spikeCollection({
  slug: COLLECTIONS.billingDocuments,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'number',
    defaultColumns: ['number', 'kind', 'status', 'totalMinor'],
  },
  fields: [
    selectOf('kind', BILLING_KINDS, { required: true, index: true }),
    textField('number', { required: true, unique: true, maxLength: 20 }),
    selectOf('status', BILLING_STATUSES, { required: true, index: true, defaultValue: 'draft' }),
    relationshipTo('organization', COLLECTIONS.organizations, { required: true, index: true }),
    relationshipTo('deal', COLLECTIONS.deals),
    relationshipTo('contact', COLLECTIONS.contacts),
    currencyField('currency', { required: true }),
    jsonField('lines', { required: true }),
    textField('note', { maxLength: 2000 }),
    epochMs('dueAt'),
    textField('paymentLink', { maxLength: 500 }),
    textField('sourceQuoteId', { maxLength: 40 }),
    epochMs('sentAt'),
    epochMs('decidedAt'),
    epochMs('paidAt'),
    minorUnitsField('subtotalMinor'),
    minorUnitsField('taxMinor'),
    minorUnitsField('totalMinor'),
    relationshipTo('createdBy', COLLECTIONS.users),
  ],
})

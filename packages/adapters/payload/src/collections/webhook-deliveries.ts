import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, countField, epochMs, spikeCollection, textField } from './fields'

/** The final outcome of sending one event to one webhook, kept for two weeks so an owner can see what the other system answered. */
export const webhookDeliveriesCollection = spikeCollection({
  slug: COLLECTIONS.webhookDeliveries,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['webhook', 'event', 'status', 'at'] },
  fields: [
    textField('webhook', { required: true, maxLength: 64, index: true }),
    textField('webhookName', { maxLength: 80 }),
    textField('event', { required: true, maxLength: 60 }),
    textField('recordType', { maxLength: 40 }),
    textField('recordId', { maxLength: 64 }),
    { name: 'ok', type: 'checkbox', defaultValue: false },
    // The HTTP status the receiver answered, or empty when it could not be reached.
    countField('status'),
    countField('attempts'),
    textField('error', { maxLength: 80 }),
    epochMs('at', { required: true, index: true }),
  ],
})

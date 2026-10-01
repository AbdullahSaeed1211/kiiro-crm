import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, countField, jsonField, selectOf, spikeCollection, textField } from './fields'

/** A newsletter that is going out in rounds: the message, who has not had it yet, and how far it has got. */
export const campaignQueueCollection = spikeCollection({
  slug: COLLECTIONS.campaignQueue,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'subject', defaultColumns: ['subject', 'status', 'createdAt'] },
  fields: [
    textField('campaignId', { required: true, index: true }),
    textField('subject', { required: true }),
    textField('body', { required: true }),
    textField('origin', { required: true }),
    textField('fromAddress', { required: true }),
    selectOf('status', ['sending', 'done'], { required: true, defaultValue: 'sending', index: true }),
    countField('total', { required: true }),
    countField('sent', { required: true }),
    countField('failed', { required: true }),
    // Contact ids still to receive it, taken off the front as each round is claimed.
    jsonField('pending'),
  ],
})

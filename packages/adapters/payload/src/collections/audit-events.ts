import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, jsonField, relationshipTo, spikeCollection, textField } from './fields'

/**
 * Security and settings events: who changed access, settings or tokens, and who downloaded data. Append-only; only
 * system writes through the Local API reach it, and owners and managers read it on the Activity page.
 */
export const auditEventsCollection = spikeCollection({
  slug: COLLECTIONS.auditEvents,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'verb', defaultColumns: ['verb', 'summary', 'occurredAt'] },
  fields: [
    textField('verb', { required: true, index: true, maxLength: 80 }),
    // Empty for system actions.
    relationshipTo('actor', COLLECTIONS.users),
    // Names the thing the event is about, in words, such as an email address or a settings section.
    textField('summary', { maxLength: 300 }),
    jsonField('data'),
    epochMs('occurredAt', { required: true, index: true }),
  ],
})

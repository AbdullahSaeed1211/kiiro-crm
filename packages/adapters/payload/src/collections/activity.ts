import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, jsonField, recordReference, relationshipTo, selectOf, spikeCollection } from './fields'
import { ACTIVITY_VERB_VALUES } from './values'

/** Append-only record history (spec §9.5); only system writes through the Local API reach it. */
export const activityCollection = spikeCollection({
  slug: COLLECTIONS.activity,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['verb', 'recordType', 'recordId', 'occurredAt'] },
  fields: [
    ...recordReference({ required: true }),
    selectOf('verb', ACTIVITY_VERB_VALUES, { required: true }),
    // Empty for system actions such as jobs and intake.
    relationshipTo('actor', COLLECTIONS.users),
    jsonField('data'),
    epochMs('occurredAt', { required: true }),
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'occurredAt'] }],
})

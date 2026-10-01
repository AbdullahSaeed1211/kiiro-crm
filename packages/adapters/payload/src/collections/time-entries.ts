import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, relationshipTo, spikeCollection, textField } from './fields'

/** Time someone logged against a task: whole minutes on a day, with an optional note. Written by server code only. */
export const timeEntriesCollection = spikeCollection({
  slug: COLLECTIONS.timeEntries,
  admin: { group: ADMIN_GROUPS.records, defaultColumns: ['task', 'user', 'minutes', 'day'] },
  fields: [
    relationshipTo('task', COLLECTIONS.tasks, { required: true, index: true }),
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    { name: 'minutes', type: 'number', required: true, min: 1, max: 1440 },
    epochMs('day', { required: true, index: true }),
    textField('note', { maxLength: 500 }),
  ],
})

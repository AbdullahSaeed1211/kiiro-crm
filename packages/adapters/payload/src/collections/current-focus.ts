import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, relationshipTo, spikeCollection } from './fields'

/** One self-reported active task per user; separate from logged time. */
export const currentFocusCollection = spikeCollection({
  slug: COLLECTIONS.currentFocus,
  admin: { group: ADMIN_GROUPS.system, hidden: true, defaultColumns: ['user', 'task', 'startedAt'] },
  fields: [
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    relationshipTo('task', COLLECTIONS.tasks, { required: true, index: true }),
    epochMs('startedAt', { required: true, index: true }),
  ],
  indexes: [{ fields: ['user'], unique: true }],
})

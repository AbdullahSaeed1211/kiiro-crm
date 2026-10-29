import { personalTaskDayPlanRead } from '../access/spike-access'
import { systemOnly } from '../access/rules'
import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, relationshipTo, spikeCollection } from './fields'

/** Private per-user intent for one workspace calendar day; it never changes the task deadline. */
const base = spikeCollection({
  slug: COLLECTIONS.taskDayPlans,
  admin: { group: ADMIN_GROUPS.system, hidden: true, defaultColumns: ['user', 'day', 'task'] },
  fields: [
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    relationshipTo('task', COLLECTIONS.tasks, { required: true, index: true }),
    {
      name: 'day',
      type: 'number',
      required: true,
      index: true,
      admin: { description: 'UTC midnight in milliseconds for the workspace calendar date.' },
    },
  ],
  indexes: [{ fields: ['user', 'day', 'task'], unique: true }],
})

export const taskDayPlansCollection = {
  ...base,
  access: { read: personalTaskDayPlanRead, create: systemOnly, update: systemOnly, delete: systemOnly },
}

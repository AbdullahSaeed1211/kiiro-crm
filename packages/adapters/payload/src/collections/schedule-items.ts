import type { CollectionConfig } from 'payload'
import { personalScheduleRead } from '../access/spike-access'
import { COLLECTIONS } from '../contracts/names'
import { systemOnly } from '../access/rules'
import { ADMIN_GROUPS, epochMs, hasManyTo, selectOf, spikeCollection, textField } from './fields'
import { filterToReadableParents } from './collaboration/parent-read-hooks'

const definition = {
  slug: COLLECTIONS.scheduleItems,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['kind', 'recordType', 'recordId', 'startsAt', 'status'],
  },
  fields: [
    selectOf('kind', ['appointment', 'callback'], { required: true, index: true }),
    selectOf('recordType', ['lead', 'contact'], { required: true, index: true }),
    textField('recordId', { required: true, index: true }),
    hasManyTo('assignees', COLLECTIONS.users),
    epochMs('startsAt', { required: true, index: true }),
    selectOf('status', ['scheduled', 'completed', 'cancelled'], {
      required: true,
      defaultValue: 'scheduled',
      index: true,
    }),
    textField('title', { maxLength: 300 }),
    { name: 'notes', type: 'textarea', maxLength: 5_000 },
    textField('sourceKey', { unique: true }),
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'startsAt'] }, { fields: ['startsAt', 'status'] }],
} satisfies Parameters<typeof spikeCollection>[0]

const base = spikeCollection(definition)

/** Schedule entries inherit visibility from their CRM parent; every write goes through scoped commands. */
export const scheduleItemsCollection: CollectionConfig = {
  ...base,
  admin: { ...base.admin, hidden: true },
  access: { read: personalScheduleRead, create: systemOnly, update: systemOnly, delete: systemOnly },
  hooks: { afterOperation: [filterToReadableParents] },
}

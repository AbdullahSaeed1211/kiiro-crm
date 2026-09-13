import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, spikeCollection, textField } from './fields'

/** Teams of users; staff see tasks assigned to their groups (spec §9.10). */
export const groupsCollection = spikeCollection({
  slug: COLLECTIONS.groups,
  admin: { group: ADMIN_GROUPS.people, useAsTitle: 'name' },
  fields: [textField('name', { required: true, unique: true, maxLength: 120 })],
})

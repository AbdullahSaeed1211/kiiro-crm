import { COLLECTIONS, FIELDS } from '../contracts/names'
import { ADMIN_GROUPS, customDataField, relationshipTo, spikeCollection, textField } from './fields'

/** Organization records (spec §10.1 subset for the spike). */
export const organizationsCollection = spikeCollection({
  slug: COLLECTIONS.organizations,
  admin: { group: ADMIN_GROUPS.records, useAsTitle: 'name', defaultColumns: ['name', 'email', 'phone', FIELDS.owner] },
  fields: [
    textField('name', { required: true, index: true, maxLength: 200 }),
    textField('website', { maxLength: 500 }),
    textField('phone', { maxLength: 50 }),
    { name: 'email', type: 'email' },
    relationshipTo(FIELDS.owner, COLLECTIONS.users, { index: true }),
    customDataField(),
  ],
})

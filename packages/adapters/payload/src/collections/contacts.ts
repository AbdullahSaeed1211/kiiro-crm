import { COLLECTIONS, FIELDS } from '../contracts/names'
import { ADMIN_GROUPS, customDataField, ownerField, personFields, relationshipTo, spikeCollection } from './fields'

/** Contact records (spec §10.1): people, optionally linked to an organization. */
export const contactsCollection = spikeCollection({
  slug: COLLECTIONS.contacts,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'firstName',
    defaultColumns: ['firstName', 'lastName', 'email', 'organization', FIELDS.owner],
  },
  fields: [
    ...personFields({ required: true }),
    relationshipTo('organization', COLLECTIONS.organizations, { index: true }),
    ownerField(),
    customDataField(),
  ],
})

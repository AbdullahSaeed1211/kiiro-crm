import { collaborationCollection, layoutAccess } from './fields'
import { ADMIN_GROUPS } from '../fields'

/** One configurable record layout per registered record type. */
export const layoutsCollection = collaborationCollection({
  slug: 'layouts',
  admin: { group: ADMIN_GROUPS.configuration, useAsTitle: 'recordType', defaultColumns: ['recordType'] },
  fields: [
    { name: 'recordType', type: 'text', required: true, unique: true, index: true },
    { name: 'sidebarFields', type: 'json', required: true },
    { name: 'quickCreateFields', type: 'json', required: true },
  ],
  access: layoutAccess,
})

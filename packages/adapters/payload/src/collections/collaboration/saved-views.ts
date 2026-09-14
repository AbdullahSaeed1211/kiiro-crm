import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection, savedViewAccess } from './fields'
import { ADMIN_GROUPS } from '../fields'

/** Personal and shared list/board/calendar/timeline configurations. */
export const savedViewsCollection = collaborationCollection({
  slug: 'savedViews',
  admin: {
    group: ADMIN_GROUPS.configuration,
    useAsTitle: 'name',
    defaultColumns: ['recordType', 'name', 'kind', 'owner'],
  },
  fields: [
    { name: 'recordType', type: 'text', required: true, index: true },
    { name: 'owner', type: 'relationship', relationTo: COLLECTIONS.users, index: true },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'kind', type: 'select', options: ['table', 'board', 'calendar', 'timeline'], required: true },
    { name: 'filter', type: 'json' },
    { name: 'sort', type: 'json', required: true },
    { name: 'columns', type: 'json', required: true },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
  ],
  indexes: [{ fields: ['recordType', 'owner'] }],
  access: savedViewAccess,
})

import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection } from './fields'
import { ADMIN_GROUPS } from '../fields'

/** User-owned notification channel and digest settings. */
export const notificationPrefsCollection = collaborationCollection({
  slug: 'notificationPrefs',
  admin: { group: ADMIN_GROUPS.configuration, defaultColumns: ['user', 'digestLocalTime'] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: COLLECTIONS.users, required: true, unique: true, index: true },
    { name: 'channels', type: 'json', required: true },
    { name: 'digestLocalTime', type: 'text', maxLength: 5 },
  ],
})

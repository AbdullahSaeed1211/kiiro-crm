import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection, RECORD_REFERENCE_FIELDS } from './fields'
import { ADMIN_GROUPS } from '../fields'
import { NOTIFICATION_TYPE_VALUES } from '../values'

/** Per-user in-app notifications. `dedupeKey` makes fan-out idempotent. */
export const collaborationNotificationsCollection = collaborationCollection({
  slug: 'notifications',
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['type', 'user', 'readAt', 'createdAt'] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: COLLECTIONS.users, required: true },
    { name: 'type', type: 'select', options: [...NOTIFICATION_TYPE_VALUES], required: true },
    ...RECORD_REFERENCE_FIELDS.map((field) => ({ ...field, required: false })),
    { name: 'actor', type: 'relationship', relationTo: COLLECTIONS.users },
    { name: 'data', type: 'json' },
    { name: 'dedupeKey', type: 'text', unique: true, index: true, required: true, maxLength: 300 },
    { name: 'readAt', type: 'number', min: 0 },
    { name: 'emailedAt', type: 'number', min: 0 },
  ],
  indexes: [{ fields: ['user', 'readAt', 'createdAt'] }],
})

import { COLLECTIONS } from '../../contracts/names'
import { collaborationCollection, notificationAccess, RECORD_REFERENCE_FIELDS } from './fields'
import { ADMIN_GROUPS } from '../fields'
import { NOTIFICATION_TYPE_VALUES } from '../values'

/** Per-user in-app notifications. `dedupeKey` makes fan-out idempotent. */
const UNGUARDED_KEYS: ReadonlySet<string> = new Set(['readAt', 'updatedAt', 'createdAt', 'id'])

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
  access: notificationAccess,
  hooks: {
    beforeChange: [
      // Payload passes the merged document on update, so compare values: a user may change only readAt.
      ({ data, operation, originalDoc, req }) => {
        if (operation === 'update' && req.user) {
          const next = data as Record<string, unknown>
          const before = (originalDoc ?? {}) as Record<string, unknown>
          const changed = Object.keys(next).filter(
            (key) => !UNGUARDED_KEYS.has(key) && JSON.stringify(next[key]) !== JSON.stringify(before[key]),
          )
          if (changed.length > 0) throw new Error('Only readAt can be updated.')
        }
        return data
      },
    ],
  },
})

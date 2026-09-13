import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  epochMs,
  jsonField,
  recordReference,
  relationshipTo,
  selectOf,
  spikeCollection,
  textField,
} from './fields'
import { NOTIFICATION_TYPE_VALUES } from './values'

/** In-app notifications (spec §9.8); the unique `dedupeKey` makes repeated inserts of one event a no-op. */
export const notificationsCollection = spikeCollection({
  slug: COLLECTIONS.notifications,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['type', FIELDS.user, 'readAt'] },
  fields: [
    relationshipTo(FIELDS.user, COLLECTIONS.users, { required: true }),
    selectOf('type', NOTIFICATION_TYPE_VALUES, { required: true }),
    ...recordReference(),
    relationshipTo('actor', COLLECTIONS.users),
    jsonField('data'),
    textField('dedupeKey', { required: true, unique: true, index: true, maxLength: 300 }),
    epochMs('readAt'),
    epochMs('emailedAt'),
  ],
  indexes: [{ fields: [FIELDS.user, 'readAt', 'createdAt'] }],
})

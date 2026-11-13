import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, relationshipTo, spikeCollection } from './fields'

function ownTimestamp({ data, operation, originalDoc }: { data: unknown; operation: string; originalDoc?: unknown }) {
  const input = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}
  if (operation === 'update' && typeof originalDoc === 'object' && originalDoc !== null) {
    input['user'] = Reflect.get(originalDoc, 'user')
  }
  input['lastSeenAt'] = Date.now()
  return input
}

/** Recent app activity only; this is not attendance or a declaration of current work. */
export const presenceCollection = spikeCollection({
  slug: COLLECTIONS.presence,
  admin: { group: ADMIN_GROUPS.system, hidden: true, defaultColumns: ['user', 'lastSeenAt'] },
  fields: [
    {
      ...relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
      access: { update: () => false },
    },
    epochMs('lastSeenAt', { required: true, index: true }),
  ],
  indexes: [{ fields: ['user'], unique: true }],
  hooks: { beforeChange: [ownTimestamp] },
})

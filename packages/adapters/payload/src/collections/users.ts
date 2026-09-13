import type { CollectionConfig } from 'payload'
import { canUseAdmin, SPIKE_ACCESS } from '../access/spike-access'
import { COLLECTIONS, FIELDS } from '../contracts/names'
import { ADMIN_GROUPS, hasManyTo, relationshipTo, selectOf, spikeCollection, textField } from './fields'
import { ROLE_VALUES } from './values'

// Secure cookies need HTTPS; local development runs on http://localhost.
const isProduction = process.env.NODE_ENV === 'production'

// Session and lockout settings of decision D-38.
const USERS_AUTH = {
  tokenExpiration: 604800,
  maxLoginAttempts: 5,
  lockTime: 600000,
  useAPIKey: false,
  cookies: { secure: isProduction, sameSite: 'Lax' },
} as const satisfies CollectionConfig['auth']

const base = spikeCollection({
  slug: COLLECTIONS.users,
  admin: { group: ADMIN_GROUPS.people, useAsTitle: 'name', defaultColumns: ['name', 'email', 'role', 'active'] },
  fields: [
    textField('name', { required: true, maxLength: 120 }),
    selectOf(FIELDS.role, ROLE_VALUES, { required: true, index: true, defaultValue: 'staff' }),
    { name: FIELDS.active, type: 'checkbox', defaultValue: true, index: true },
    hasManyTo(FIELDS.groups, COLLECTIONS.groups),
    relationshipTo(FIELDS.reportsTo, COLLECTIONS.users),
  ],
})

/** Auth collection of the people who sign in; the admin panel is limited to owners and managers. */
export const usersCollection: CollectionConfig = {
  ...base,
  access: { ...SPIKE_ACCESS[COLLECTIONS.users], admin: canUseAdmin },
  auth: { ...USERS_AUTH, cookies: { ...USERS_AUTH.cookies } },
}

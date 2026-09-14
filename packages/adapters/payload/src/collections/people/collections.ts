import type { CollectionConfig } from 'payload'
import { authHooks } from '../../hooks/auth/auth'
import { ADMIN_GROUPS } from '../fields'
import { peopleAccess, userFieldRead } from './access'
import { INVITATION_STATUS_VALUES, PEOPLE_COLLECTIONS, PEOPLE_ROLE_VALUES } from './values'

const relation = (name: string, relationTo: string, options: Record<string, unknown> = {}) => ({
  name,
  type: 'relationship' as const,
  relationTo,
  ...options,
})

const text = (name: string, options: Record<string, unknown> = {}) => ({ name, type: 'text' as const, ...options })
const epoch = (name: string, options: Record<string, unknown> = {}) => ({
  name,
  type: 'number' as const,
  min: 0,
  ...options,
})
function resetUserName(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('name' in value)) return 'Workspace'
  const name = value.name
  return typeof name === 'string' ? name : 'Workspace'
}

type AccessConfig = NonNullable<CollectionConfig['access']>
interface BaseDefinition {
  readonly slug: string
  readonly group: string
  readonly fields: CollectionConfig['fields']
  readonly access: AccessConfig
}
const base = ({ slug, group, fields, access }: BaseDefinition): CollectionConfig => ({
  slug,
  admin: { group, useAsTitle: 'name' },
  fields,
  access,
  timestamps: true,
  versions: false,
})

export const peopleUsersCollection: CollectionConfig = {
  ...base({
    slug: PEOPLE_COLLECTIONS.users,
    group: ADMIN_GROUPS.people,
    fields: [
      text('name', { required: true, maxLength: 120 }),
      text('avatar', { maxLength: 500, access: { read: userFieldRead('avatar') } }),
      text('invitationId', { maxLength: 120, access: { read: () => false, update: () => false } }),
      {
        name: 'role',
        type: 'select',
        options: [...PEOPLE_ROLE_VALUES],
        required: true,
        defaultValue: 'staff',
        index: true,
        access: { read: userFieldRead('role') },
      },
      { name: 'active', type: 'checkbox', defaultValue: true, index: true, access: { read: userFieldRead('active') } },
      { ...relation('groups', PEOPLE_COLLECTIONS.groups), hasMany: true, access: { read: userFieldRead('groups') } },
      { ...relation('reportsTo', PEOPLE_COLLECTIONS.users), access: { read: userFieldRead('reportsTo') } },
    ],
    access: peopleAccess.users,
  }),
  auth: {
    tokenExpiration: 604800,
    maxLoginAttempts: 5,
    lockTime: 600000,
    useAPIKey: false,
    forgotPassword: {
      expiration: 3600000,
      generateEmailSubject: (args) => `Reset your ${resetUserName(args?.user)} password`,
      generateEmailHTML: (args) =>
        `<p>Use this link to reset your password:</p><p>${process.env['APP_ORIGIN'] ?? ''}/reset-password?token=${encodeURIComponent(args?.token ?? '')}</p>`,
    },
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  hooks: {
    beforeLogin: [...authHooks.beforeLogin],
    beforeChange: [...authHooks.beforeChange],
    afterOperation: [...authHooks.afterOperation],
    afterError: [...authHooks.afterError],
  },
}

export const peopleGroupsCollection: CollectionConfig = base({
  slug: PEOPLE_COLLECTIONS.groups,
  group: ADMIN_GROUPS.people,
  fields: [text('name', { required: true, unique: true, index: true, maxLength: 120 })],
  access: {
    read: peopleAccess.groups.read,
    create: peopleAccess.groups.create,
    update: peopleAccess.groups.update,
    delete: peopleAccess.groups.delete,
  },
})

export const invitationsCollection: CollectionConfig = base({
  slug: PEOPLE_COLLECTIONS.invitations,
  group: ADMIN_GROUPS.people,
  fields: [
    text('tokenHash', { required: true, unique: true, index: true, maxLength: 64 }),
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'role', type: 'select', options: [...PEOPLE_ROLE_VALUES], required: true },
    {
      name: 'status',
      type: 'select',
      options: [...INVITATION_STATUS_VALUES],
      required: true,
      defaultValue: 'pending',
      index: true,
    },
    relation('invitedBy', PEOPLE_COLLECTIONS.users),
    { ...relation('groups', PEOPLE_COLLECTIONS.groups), hasMany: true },
    relation('reportsTo', PEOPLE_COLLECTIONS.users),
    epoch('expiresAt', { required: true, index: true }),
    epoch('acceptedAt'),
    text('claimId', { maxLength: 64, index: true }),
    epoch('claimedAt'),
  ],
  access: {
    read: peopleAccess.invitations.read,
    create: peopleAccess.invitations.create,
    update: peopleAccess.invitations.update,
    delete: peopleAccess.invitations.delete,
  },
})

export const notificationPrefsCollection: CollectionConfig = {
  ...base({
    slug: PEOPLE_COLLECTIONS.notificationPrefs,
    group: ADMIN_GROUPS.people,
    fields: [
      relation('user', PEOPLE_COLLECTIONS.users, { required: true, unique: true, index: true }),
      { name: 'channels', type: 'json', required: true, defaultValue: {} },
      text('digestLocalTime', { maxLength: 5 }),
    ],
    access: {
      read: peopleAccess.notificationPrefs.read,
      create: peopleAccess.notificationPrefs.create,
      update: peopleAccess.notificationPrefs.update,
      delete: peopleAccess.notificationPrefs.delete,
    },
  }),
  indexes: [{ fields: ['user'], unique: true }],
}

export const peopleCollections: readonly CollectionConfig[] = [
  peopleUsersCollection,
  peopleGroupsCollection,
  invitationsCollection,
  notificationPrefsCollection,
]

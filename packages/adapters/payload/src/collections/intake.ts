import type { Access, CollectionConfig } from 'payload'
import { managerUp, systemOnly } from '../access/rules'
import { COLLECTIONS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  epochMs,
  hasManyTo,
  jsonField,
  relationshipTo,
  selectOf,
  stringListField,
  textField,
} from './fields'

const noAccess: Access = () => false
const timestamps = true as const
const versions = false as const

/** Public intake form configuration; only owners and managers can administer it. */
export const intakeFormsCollection: CollectionConfig = {
  slug: COLLECTIONS.intakeForms,
  admin: { group: ADMIN_GROUPS.configuration, useAsTitle: 'name' },
  access: { read: managerUp, create: managerUp, update: managerUp, delete: managerUp },
  timestamps,
  versions,
  fields: [
    textField('key', { required: true, unique: true, index: true, maxLength: 60 }),
    textField('name', { required: true, maxLength: 120 }),
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
    { name: 'targetRecordType', type: 'select', options: ['lead'], required: true, defaultValue: 'lead' },
    jsonField('fieldMap', { required: true }),
    stringListField('allowedOrigins'),
    { name: 'requireTurnstile', type: 'checkbox', required: true, defaultValue: true },
    stringListField('serverKeyHashes'),
    relationshipTo('defaultOwner', COLLECTIONS.users),
    hasManyTo('defaultAssignees', COLLECTIONS.users),
    relationshipTo('defaultSource', COLLECTIONS.sources),
    hasManyTo('notifyUsers', COLLECTIONS.users),
    hasManyTo('notifyGroups', COLLECTIONS.groups),
    textField('successMessage', { required: true, maxLength: 500 }),
    textField('redirectUrl', { maxLength: 500 }),
    textField('emailAlias', { unique: true, index: true, maxLength: 64 }),
  ],
}

/** Immutable intake delivery ledger; only system commands write or purge it. */
export const intakeSubmissionsCollection: CollectionConfig = {
  slug: COLLECTIONS.intakeSubmissions,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'dedupeKey' },
  access: { read: managerUp, create: systemOnly, update: noAccess, delete: systemOnly },
  timestamps,
  versions,
  fields: [
    relationshipTo('form', COLLECTIONS.intakeForms, { required: true, index: true }),
    selectOf('channel', ['web', 'server', 'email'], { required: true }),
    epochMs('receivedAt', { required: true, index: true }),
    textField('origin', { required: true, maxLength: 500 }),
    textField('ipHash', { required: true, maxLength: 64 }),
    textField('userAgent', { required: true, maxLength: 500 }),
    jsonField('payload', { required: true }),
    textField('dedupeKey', { required: true, unique: true, index: true, maxLength: 64 }),
    selectOf('status', ['accepted', 'duplicate', 'rejected_spam', 'rejected_invalid'], { required: true }),
    selectOf('recordType', ['lead']),
    textField('recordId', { maxLength: 36 }),
  ],
  indexes: [{ fields: ['form', 'receivedAt'] }],
}

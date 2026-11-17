import type { Access, CollectionConfig } from 'payload'
import { isManagerUp } from '@ops/platform'
import { resolveActor } from '../access/actor'
import { managerUp, systemOnly } from '../access/rules'
import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, hasManyTo, jsonField, relationshipTo, selectOf, textField } from './fields'

const noAccess: Access = () => false
const privateRows = { read: noAccess, create: systemOnly, update: systemOnly, delete: systemOnly }

const numberRead: Access = async ({ req }) => {
  const actor = await resolveActor(req)
  if (!actor?.active) return false
  if (isManagerUp(actor)) return true
  return { assignees: { contains: actor.id } }
}

export const voiceSettingsCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceSettings,
  admin: { group: ADMIN_GROUPS.configuration, hidden: true },
  access: { read: managerUp, create: systemOnly, update: systemOnly, delete: systemOnly },
  timestamps: true,
  versions: false,
  fields: [jsonField('value', { required: true })],
}

export const voiceNumbersCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceNumbers,
  admin: { group: ADMIN_GROUPS.configuration, hidden: true, useAsTitle: 'e164' },
  access: { read: numberRead, create: systemOnly, update: systemOnly, delete: systemOnly },
  timestamps: true,
  versions: false,
  fields: [
    textField('e164', { required: true, unique: true, index: true, maxLength: 32 }),
    hasManyTo('assignees', COLLECTIONS.users),
    selectOf('status', ['pending', 'active', 'failed', 'released'], { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
}

export const voiceCallsCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceCalls,
  admin: {
    group: ADMIN_GROUPS.system,
    hidden: true,
    useAsTitle: 'requestKey',
    defaultColumns: ['direction', 'state', 'user', 'createdAt'],
  },
  access: privateRows,
  timestamps: true,
  versions: false,
  fields: [
    textField('requestKey', { required: true, unique: true, index: true, maxLength: 180 }),
    selectOf('direction', ['inbound', 'outbound'], { required: true, index: true }),
    selectOf('state', ['authorizing', 'ringing', 'connecting', 'active', 'ended', 'failed', 'missed'], {
      required: true,
      index: true,
    }),
    relationshipTo('number', COLLECTIONS.voiceNumbers, { required: true, index: true }),
    relationshipTo('user', COLLECTIONS.users, { index: true }),
    hasManyTo('assignedUsers', COLLECTIONS.users),
    textField('providerCallId', { index: true, maxLength: 180 }),
    textField('recoveryError', { index: true, maxLength: 80 }),
    epochMs('voiceUpdatedAt', { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
  indexes: [{ fields: ['user', 'state'] }],
}

export const voiceCallLegsCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceCallLegs,
  admin: { group: ADMIN_GROUPS.system, hidden: true },
  access: privateRows,
  timestamps: true,
  versions: false,
  fields: [
    textField('legKey', { required: true, unique: true, index: true, maxLength: 250 }),
    relationshipTo('call', COLLECTIONS.voiceCalls, { required: true, index: true }),
    textField('deviceId', { maxLength: 180 }),
    selectOf('kind', ['inbound-caller', 'inbound-device', 'outbound-browser', 'outbound-pstn'], {
      required: true,
      index: true,
    }),
    selectOf('state', ['dialing', 'ringing', 'answered', 'bridged', 'ended', 'failed'], {
      required: true,
      index: true,
    }),
    textField('providerCallId', { index: true, maxLength: 180 }),
    epochMs('voiceUpdatedAt', { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
  indexes: [{ fields: ['call', 'kind'] }],
}

export const voiceDevicesCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceDevices,
  admin: { group: ADMIN_GROUPS.system, hidden: true },
  access: privateRows,
  timestamps: true,
  versions: false,
  fields: [
    textField('key', { required: true, unique: true, index: true, maxLength: 180 }),
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    textField('deviceId', { required: true, maxLength: 180 }),
    epochMs('expiresAt', { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
  indexes: [{ fields: ['user', 'deviceId'], unique: true }],
}

export const voiceEventsCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceEvents,
  admin: { group: ADMIN_GROUPS.system, hidden: true, useAsTitle: 'eventKey' },
  access: privateRows,
  timestamps: true,
  versions: false,
  fields: [
    textField('eventKey', { required: true, unique: true, index: true, maxLength: 250 }),
    selectOf('status', ['pending', 'processing', 'processed', 'failed'], { required: true, index: true }),
    epochMs('leaseUntil', { index: true }),
    epochMs('receivedAt', { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
  indexes: [{ fields: ['status', 'leaseUntil'] }],
}

export const voiceOperationsCollection: CollectionConfig = {
  slug: COLLECTIONS.voiceOperations,
  admin: { group: ADMIN_GROUPS.system, hidden: true, useAsTitle: 'key' },
  access: privateRows,
  timestamps: true,
  versions: false,
  fields: [
    textField('key', { required: true, unique: true, index: true, maxLength: 180 }),
    relationshipTo('user', COLLECTIONS.users, { required: true, index: true }),
    selectOf('kind', ['purchase', 'release'], { required: true, index: true }),
    selectOf('status', ['pending', 'complete', 'failed', 'uncertain'], { required: true, index: true }),
    jsonField('value', { required: true }),
  ],
}

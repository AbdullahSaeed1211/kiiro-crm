import { can, isManagerUp, type Actor } from '@ops/platform'
import type { Access, Where } from 'payload'
import { COLLECTIONS, FIELDS, RECORD_TYPES, type SpikeCollectionSlug } from '../contracts/names'
import { resolveActor } from './actor'
import { allow, anyActive, equalsActor, managerUp, ownedBy, ownerOnly, scoped, systemOnly } from './rules'

/** Access functions for one collection. */
export interface CollectionAccess {
  readonly read: Access
  readonly create: Access
  readonly update: Access
  readonly delete: Access
}

const managedByLeads: Omit<CollectionAccess, 'read'> = { create: managerUp, update: managerUp, delete: managerUp }
const systemWrites: Omit<CollectionAccess, 'read'> = { create: systemOnly, update: systemOnly, delete: systemOnly }

function scopedRecord(recordType: string): CollectionAccess {
  return { read: scoped(recordType), create: anyActive, update: scoped(recordType), delete: managerUp }
}

// Owners update every user, managers staff users and themselves, staff only themselves (spec §11.1). Field-level
// limits (a manager promoting staff, staff editing only name and avatar) arrive with the M3 collection hooks.
function nonOwnerUserScope(actor: Actor): Where {
  const self = equalsActor('id', actor.id)
  return actor.role === 'manager' ? { or: [self, { [FIELDS.role]: { equals: 'staff' } }] } : self
}

const updateUsers = allow((actor) => actor.role === 'owner' || nonOwnerUserScope(actor))

/**
 * Spec §11.1 access for the spike collections. Activity, attachments and email messages inherit their parent record's
 * access in the full design; in the spike, staff read them only through server queries that authorize the parent.
 */
export const SPIKE_ACCESS: Readonly<Record<SpikeCollectionSlug, CollectionAccess>> = {
  [COLLECTIONS.users]: {
    read: allow((actor) => isManagerUp(actor) || { [FIELDS.active]: { equals: true } }),
    create: systemOnly,
    update: updateUsers,
    delete: systemOnly,
  },
  [COLLECTIONS.groups]: { read: anyActive, ...managedByLeads },
  [COLLECTIONS.organizations]: scopedRecord(RECORD_TYPES.organizations),
  [COLLECTIONS.projects]: scopedRecord(RECORD_TYPES.projects),
  [COLLECTIONS.tasks]: scopedRecord(RECORD_TYPES.tasks),
  [COLLECTIONS.workflows]: { read: anyActive, ...managedByLeads },
  [COLLECTIONS.activity]: { read: managerUp, ...systemWrites },
  [COLLECTIONS.attachments]: {
    read: managerUp,
    create: anyActive,
    update: systemOnly,
    delete: allow((actor) => isManagerUp(actor) || equalsActor(FIELDS.uploadedBy, actor.id)),
  },
  [COLLECTIONS.notifications]: {
    read: ownedBy(FIELDS.user),
    create: systemOnly,
    update: ownedBy(FIELDS.user),
    delete: systemOnly,
  },
  [COLLECTIONS.emailMessages]: { read: managerUp, ...systemWrites },
  [COLLECTIONS.jobRuns]: { read: managerUp, ...systemWrites },
  [COLLECTIONS.intakeForms]: { read: managerUp, ...managedByLeads },
  [COLLECTIONS.intakeSubmissions]: { read: managerUp, ...systemWrites },
  [COLLECTIONS.contacts]: scopedRecord(RECORD_TYPES.contacts),
  [COLLECTIONS.leads]: scopedRecord(RECORD_TYPES.leads),
  [COLLECTIONS.deals]: scopedRecord(RECORD_TYPES.deals),
  [COLLECTIONS.sources]: { read: anyActive, ...managedByLeads },
  [COLLECTIONS.lostReasons]: { read: anyActive, ...managedByLeads },
  // Transitions inherit the parent record's access in the full design; staff read them through record queries.
  [COLLECTIONS.stageTransitions]: { read: managerUp, ...systemWrites },
}

/** Access for the settings global: every active user reads, only owners update. */
export const SETTINGS_ACCESS = { read: anyActive, update: ownerOnly } as const

/** `access.admin` of the users collection: the admin panel is for owners and managers (spec §17.13). */
export async function canUseAdmin({ req }: Parameters<Access>[0]): Promise<boolean> {
  const actor = await resolveActor(req)
  return actor !== undefined && can(actor, 'admin_panel', { type: COLLECTIONS.users })
}

import { COLLECTIONS, FIELDS } from '../contracts/names'
import { resolveActor } from '../access/actor'
import { APIError, type CollectionBeforeChangeHook } from 'payload'
import {
  ADMIN_GROUPS,
  customDataField,
  jsonField,
  epochMs,
  hasManyTo,
  recordReference,
  relationshipTo,
  selectOf,
  spikeCollection,
  stageFields,
  textField,
} from './fields'
import { PROJECT_DESCRIPTION_MAX } from './projects'
import { PRIORITY_VALUES, TASK_REPEAT_VALUES } from './values'
import { workProfileAllows, type Actor } from '@ops/platform'

const TASK_TITLE_MAX = 300

function record(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>
}

function idOf(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null) {
    const id: unknown = Reflect.get(value, 'id')
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  return undefined
}

function idsOf(value: unknown): string[] {
  let entries: readonly unknown[]
  if (Array.isArray(value)) entries = value
  else if (value === null || value === undefined) entries = []
  else entries = [value]
  return entries.flatMap((entry) => {
    const id = idOf(entry)
    return id === undefined ? [] : [id]
  })
}

function effective(next: Record<string, unknown>, previous: Record<string, unknown>, name: string): unknown {
  return next[name] === undefined ? previous[name] : next[name]
}

interface Responsibility {
  readonly primary: string | null
  readonly collaborators: readonly string[]
  readonly watchers: readonly string[]
  readonly assignees: readonly string[]
  readonly participants: readonly string[]
  readonly touched: boolean
  readonly changed: boolean
}

function primaryFor(input: {
  readonly next: Record<string, unknown>
  readonly previous: Record<string, unknown>
  readonly legacy: readonly string[]
  readonly canonicalRolesWereSent: boolean
}): string | null {
  const { next, previous, legacy, canonicalRolesWereSent } = input
  const storedPrimary = idOf(effective(next, previous, 'primaryAssigneeId'))
  // Payload may materialize the nullable text field on unrelated updates. Treat null + no
  // collaborators as a legacy record when the legacy relationship still has assignees.
  // Module writes always send the collaborator list, so an explicit canonical null remains
  // authoritative when the canonical and legacy representations agree (including [] for unassigned).
  if (canonicalRolesWereSent) return storedPrimary ?? null
  if (legacy.length > 0) return legacy[0] ?? null
  return storedPrimary ?? legacy[0] ?? null
}

function collaboratorsFor(input: {
  readonly next: Record<string, unknown>
  readonly previous: Record<string, unknown>
  readonly legacy: readonly string[]
  readonly primary: string | null
  readonly canonicalRolesWereSent: boolean
}): string[] {
  const { next, previous, legacy, primary, canonicalRolesWereSent } = input
  if (canonicalRolesWereSent) {
    const current = effective(next, previous, 'collaboratorIds')
    return Array.isArray(current) ? idsOf(current) : legacy.filter((id) => id !== primary)
  }
  return legacy.filter((id) => id !== primary)
}

function hasCanonicalResponsibility(input: {
  readonly primaryWasSent: boolean
  readonly collaboratorWasSent: boolean
  readonly primary: unknown
  readonly collaborators: readonly string[]
  readonly legacy: readonly string[]
}): boolean {
  const { primaryWasSent, collaboratorWasSent, primary, collaborators, legacy } = input
  return (
    (primaryWasSent || collaboratorWasSent) &&
    (idOf(primary) !== undefined || collaborators.length > 0 || legacy.length === 0)
  )
}

function responsibility(next: Record<string, unknown>, previous: Record<string, unknown>): Responsibility {
  const legacyWasSent = Object.hasOwn(next, FIELDS.assignees)
  const primaryWasSent = Object.hasOwn(next, 'primaryAssigneeId')
  const collaboratorWasSent = Object.hasOwn(next, 'collaboratorIds')
  const legacy = idsOf(effective(next, previous, FIELDS.assignees))
  const previousLegacy = idsOf(previous[FIELDS.assignees])
  const currentCollaborators = idsOf(effective(next, previous, 'collaboratorIds'))
  const canonicalRolesWereSent = hasCanonicalResponsibility({
    primaryWasSent,
    collaboratorWasSent,
    primary: effective(next, previous, 'primaryAssigneeId'),
    collaborators: currentCollaborators,
    legacy,
  })
  const primary = primaryFor({ next, previous, legacy, canonicalRolesWereSent })
  const collaborators = collaboratorsFor({ next, previous, legacy, primary, canonicalRolesWereSent })
  const watchers = idsOf(effective(next, previous, 'watcherIds'))
  const assignees = [...(primary === null ? [] : [primary]), ...collaborators]
  return {
    primary,
    collaborators,
    watchers,
    assignees,
    participants: [...assignees, ...watchers],
    touched: legacyWasSent || primaryWasSent || collaboratorWasSent || Object.hasOwn(next, 'watcherIds'),
    changed: responsibilityChanged({ previous, legacy: previousLegacy, primary, collaborators }),
  }
}

function responsibilityChanged(input: {
  readonly previous: Record<string, unknown>
  readonly legacy: readonly string[]
  readonly primary: string | null
  readonly collaborators: readonly string[]
}): boolean {
  const { previous, legacy, primary, collaborators } = input
  const priorPrimary = idOf(previous['primaryAssigneeId']) ?? legacy[0] ?? null
  const priorCollaborators = Array.isArray(previous['collaboratorIds'])
    ? idsOf(previous['collaboratorIds'])
    : legacy.slice(1)
  return priorPrimary !== primary || JSON.stringify(priorCollaborators) !== JSON.stringify(collaborators)
}

function blockedState(next: Record<string, unknown>, previous: Record<string, unknown>): string | null {
  const reason = effective(next, previous, 'blockedReason')
  const blockedReason = normalizeBlockReason(reason)
  const requestedWaitingOn = next['waitingOnId']
  if (blockedReason === null && requestedWaitingOn !== null && requestedWaitingOn !== undefined)
    throw new APIError('A waiting person requires a blocked reason.', 400)
  const waitingOn = blockedReason === null ? null : effective(next, previous, 'waitingOnId')
  next['blockedReason'] = blockedReason
  next['waitingOnId'] = blockedReason === null ? null : waitingOn
  return blockedReason
}

function normalizeBlockReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null
  const trimmed = reason.trim()
  return trimmed.length === 0 ? null : trimmed
}

async function validateActiveParticipants(
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
  input: { readonly actor: Actor | undefined; readonly members: readonly string[]; readonly waitingOn: unknown },
): Promise<void> {
  const { actor, members, waitingOn } = input
  if (actor === undefined) return
  if (members.length > 0) {
    const active = await req.payload.find({
      collection: COLLECTIONS.users,
      where: { and: [{ id: { in: [...members] } }, { active: { equals: true } }] },
      limit: members.length,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const activeIds = new Set(
      active.docs.flatMap((user) => {
        const id = idOf(user)
        return id === undefined ? [] : [id]
      }),
    )
    if (members.some((id) => !activeIds.has(id)))
      throw new APIError('Task participants must be active tenant members.', 400)
  }
  if (waitingOn === null || waitingOn === undefined) return
  const id = idOf(waitingOn)
  if (id === undefined) throw new APIError('The waiting person must be an active tenant member.', 400)
  const result = await req.payload.find({
    collection: COLLECTIONS.users,
    where: { and: [{ id: { equals: id } }, { active: { equals: true } }] },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (result.totalDocs === 0) throw new APIError('The waiting person must be an active tenant member.', 400)
}

/** Keeps raw Payload writes aligned with module responsibility semantics and prevents client assigner spoofing. */
const enforceTaskResponsibility: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const next = record(data)
  const previous = record(originalDoc)
  const roles = responsibility(next, previous)
  if (new Set(roles.participants).size !== roles.participants.length)
    throw new APIError('Task participants must be distinct.', 400)
  blockedState(next, previous)
  const actor = await resolveActor(req)
  await validateActiveParticipants(req, {
    actor,
    members: roles.participants,
    waitingOn: next['waitingOnId'],
  })
  next['primaryAssigneeId'] = roles.primary
  next['collaboratorIds'] = roles.collaborators
  next['watcherIds'] = roles.watchers
  next[FIELDS.assignees] = roles.assignees
  if (actor !== undefined && (operation === 'create' || (roles.touched && roles.changed)))
    next['assignedById'] = actor.id
  else next['assignedById'] = previous['assignedById'] ?? null
  return next
}

function taskFitsProfile(actor: Actor, facts: Readonly<Record<string, unknown>>): boolean {
  const ownerOnly = facts['ownerOnly'] === true
  if (ownerOnly && actor.role !== 'owner') return false
  const parentId = facts['project'] === undefined || facts['project'] === null ? null : actor.id
  const relatedRecordType = typeof facts['relatedType'] === 'string' ? facts['relatedType'] : null
  return workProfileAllows(actor, { type: 'task', parentId, relatedRecordType, ownerOnly })
}

const enforceTaskProfile: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const actor = await resolveActor(req)
  // Public requests fail collection access before hooks run; a missing user here identifies only trusted Local API
  // system writes, including seed and recurrence jobs, which deliberately run with overrideAccess.
  if (actor === undefined) return record(data)
  if (!actor.active) throw new APIError('An active user is required.', 403)
  const next = record(data)
  const previous = record(originalDoc)
  const facts = {
    project: effective(next, previous, 'project'),
    ownerOnly: effective(next, previous, 'ownerOnly'),
    relatedType: effective(next, previous, 'relatedType'),
  }
  if (!taskFitsProfile(actor, facts)) {
    const message =
      facts.ownerOnly === true
        ? 'Only an owner can create or manage owner-only tasks.'
        : 'Sales staff can only access standalone tasks.'
    throw new APIError(message, 403)
  }
  return next
}

/** Task records (spec §10.2); board order is `(rank, id)` within a project stage (decision D-29). */
export const tasksCollection = spikeCollection({
  trash: true,
  slug: COLLECTIONS.tasks,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'stageId', 'priority', FIELDS.assignees, 'dueAt'],
  },
  fields: [
    textField('title', { required: true, maxLength: TASK_TITLE_MAX }),
    {
      name: 'monthlyOccurrenceKey',
      type: 'text',
      unique: true,
      admin: { hidden: true },
      access: { create: () => false, update: () => false, read: () => false },
    },
    { name: 'description', type: 'textarea', maxLength: PROJECT_DESCRIPTION_MAX },
    relationshipTo(FIELDS.project, COLLECTIONS.projects),
    ...recordReference({}, { type: 'relatedType', id: 'relatedId' }),
    relationshipTo('parentTask', COLLECTIONS.tasks, { index: true }),
    ...stageFields(),
    textField('rank', { maxLength: 64 }),
    selectOf('priority', PRIORITY_VALUES, { required: true, defaultValue: 'none' }),
    selectOf('repeat', TASK_REPEAT_VALUES, { required: true, defaultValue: 'none' }),
    // Owner-only tasks, such as collections, are hidden from staff who see the rest of the project.
    { name: 'ownerOnly', type: 'checkbox', defaultValue: false },
    hasManyTo(FIELDS.assignees, COLLECTIONS.users),
    textField('primaryAssigneeId'),
    jsonField('collaboratorIds'),
    jsonField('watcherIds'),
    textField('assignedById'),
    textField('blockedReason', { maxLength: 1000 }),
    textField('waitingOnId'),
    relationshipTo(FIELDS.group, COLLECTIONS.groups),
    epochMs('startAt'),
    epochMs('dueAt', { index: true }),
    epochMs('completedAt'),
    customDataField(),
  ],
  indexes: [{ fields: [FIELDS.project, 'stageId', 'rank'] }, { fields: ['relatedType', 'relatedId'] }],
  hooks: { beforeChange: [enforceTaskProfile, enforceTaskResponsibility] },
})

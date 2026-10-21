import { isManagerUp, workProfileAllows, type Actor } from '@ops/platform'
import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload'
import { COLLECTIONS, FIELDS } from '../contracts/names'
import { resolveActor } from '../access/actor'
import { allow, systemOnly } from '../access/rules'
import {
  ADMIN_GROUPS,
  epochMs,
  relationshipTo,
  spikeCollection,
  textField,
  type SpikeCollectionDefinition,
} from './fields'
import { parentScopedRead } from './collaboration/fields'
import { filterToReadableParents } from './collaboration/parent-read-hooks'

const OUTCOMES = ['answered', 'no_answer', 'voicemail', 'follow_up'] as const
const DELIVERABLE_STATUSES = ['draft', 'sent_to_client', 'approved', 'changes_requested'] as const
const CONTENT_STATUSES = ['draft', 'scheduled', 'published'] as const

function agencyCollection({
  access,
  ...definition
}: SpikeCollectionDefinition & { access: NonNullable<CollectionConfig['access']> }): CollectionConfig {
  return { ...spikeCollection(definition), access }
}

const NO_PROJECT_ACCESS: Where = { id: { exists: false } }

function projectScopeRule(actor: Actor): Where {
  if (isManagerUp(actor)) return {}
  if (!workProfileAllows(actor, { type: 'project' })) return NO_PROJECT_ACCESS
  const ownerIds = [actor.id, ...actor.reportIds]
  return {
    or: [{ 'project.owner': { in: ownerIds } }, { 'project.members': { contains: actor.id } }],
  }
}

const projectScope: Access = async ({ req }) => {
  const actor = await resolveActor(req)
  return actor?.active === true ? projectScopeRule(actor) : false
}

const projectAccess = {
  read: projectScope,
  create: systemOnly,
  update: systemOnly,
  delete: allow(isManagerUp),
}

function relationId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) return relationId(value.id)
  return undefined
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function validDeliverableTransition(before: unknown, after: unknown): boolean {
  return (
    (before === 'draft' && after === 'sent_to_client') ||
    (before === 'sent_to_client' && (after === 'approved' || after === 'changes_requested')) ||
    (before === 'changes_requested' && after === 'sent_to_client')
  )
}

function validateDeliverableUpdate(next: Record<string, unknown>, previous: Record<string, unknown>) {
  if (next['project'] !== undefined && relationId(next['project']) !== relationId(previous['project']))
    throw new Error('The project cannot change.')
  if (
    next['status'] !== undefined &&
    next['status'] !== previous['status'] &&
    !validDeliverableTransition(previous['status'], next['status'])
  )
    throw new Error('That deliverable status change is not allowed.')
}

async function validateDeliverable({
  data,
  operation,
  originalDoc,
  req,
}: {
  data: unknown
  operation: string
  originalDoc?: unknown
  req: PayloadRequest
}): Promise<Record<string, unknown>> {
  const actor = await resolveActor(req)
  if (actor?.active !== true) throw new Error('An active user is required.')
  const next = object(data)
  const previous = object(originalDoc)
  if (operation === 'create' && next['status'] !== 'draft') throw new Error('A deliverable starts as a draft.')
  if (operation === 'update') validateDeliverableUpdate(next, previous)
  return next
}

function projectWasChanged(
  next: Record<string, unknown>,
  previous: Record<string, unknown>,
  operation: string,
): boolean {
  return (
    operation === 'update' &&
    next['project'] !== undefined &&
    relationId(next['project']) !== relationId(previous['project'])
  )
}

function scheduleIsIncomplete(status: unknown, channel: unknown, publishAt: unknown): boolean {
  return status !== 'draft' && (typeof channel !== 'string' || channel.trim() === '' || typeof publishAt !== 'number')
}

function validateContentChange(data: unknown, operation: string, originalDoc: unknown): Record<string, unknown> {
  const next = object(data)
  const previous = object(originalDoc)
  if (projectWasChanged(next, previous, operation)) throw new Error('The project cannot change.')
  const effective = (field: string) => (next[field] === undefined ? previous[field] : next[field])
  const status = effective('status') ?? 'draft'
  if (scheduleIsIncomplete(status, effective('channel'), effective('publishAt')))
    throw new Error('Scheduled or published content needs a date and channel.')
  return next
}

/** Call history is append-only and readable only through a visible lead/contact parent. */
export const callLogsCollection = agencyCollection({
  slug: COLLECTIONS.callLogs,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['recordType', 'recordId', 'caller', 'occurredAt', 'outcome'] },
  fields: [
    { name: 'recordType', type: 'select', options: ['lead', 'contact'], required: true, index: true },
    textField('recordId', { required: true, index: true }),
    relationshipTo('caller', COLLECTIONS.users, { required: true }),
    epochMs('occurredAt', { required: true, index: true }),
    { name: 'outcome', type: 'select', options: [...OUTCOMES], required: true },
    { name: 'notes', type: 'textarea', maxLength: 5_000 },
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'occurredAt'] }],
  access: {
    read: parentScopedRead,
    create: systemOnly,
    update: systemOnly,
    delete: systemOnly,
  },
  hooks: {
    afterOperation: [filterToReadableParents],
    beforeChange: [
      async ({ data, operation, req }) => {
        const actor = await resolveActor(req)
        if (actor?.active !== true) throw new Error('An active user is required.')
        const next = object(data)
        if (operation !== 'create' || relationId(next['caller']) !== String(actor.id))
          throw new Error('Call details must be recorded by the current user.')
        return next
      },
    ],
  },
})

export const deliverablesCollection = agencyCollection({
  slug: COLLECTIONS.deliverables,
  admin: { group: ADMIN_GROUPS.records, useAsTitle: 'title', defaultColumns: ['title', 'project', 'status', 'owner'] },
  fields: [
    relationshipTo('project', COLLECTIONS.projects, { required: true, index: true }),
    textField('title', { required: true, maxLength: 300 }),
    relationshipTo(FIELDS.owner, COLLECTIONS.users, { required: true, index: true }),
    {
      name: 'status',
      type: 'select',
      options: [...DELIVERABLE_STATUSES],
      required: true,
      defaultValue: 'draft',
      index: true,
    },
    textField('linkUrl', { maxLength: 2_000 }),
    relationshipTo('attachment', COLLECTIONS.attachments),
    epochMs('sentAt'),
    epochMs('respondedAt'),
    relationshipTo('respondedBy', COLLECTIONS.users),
    { name: 'responseNote', type: 'textarea', maxLength: 5_000 },
  ],
  indexes: [{ fields: ['project', 'status', 'updatedAt'] }],
  access: projectAccess,
  hooks: { beforeChange: [validateDeliverable] },
})

export const contentItemsCollection = agencyCollection({
  slug: COLLECTIONS.contentItems,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'project', 'publishAt', 'channel', 'status'],
  },
  fields: [
    relationshipTo('project', COLLECTIONS.projects, { required: true, index: true }),
    textField('title', { required: true, maxLength: 300 }),
    { name: 'body', type: 'textarea', maxLength: 20_000 },
    textField('channel', { maxLength: 100 }),
    epochMs('publishAt', { index: true }),
    {
      name: 'status',
      type: 'select',
      options: [...CONTENT_STATUSES],
      required: true,
      defaultValue: 'draft',
      index: true,
    },
    relationshipTo(FIELDS.owner, COLLECTIONS.users, { required: true, index: true }),
  ],
  indexes: [{ fields: ['publishAt', 'project'] }],
  access: projectAccess,
  hooks: { beforeChange: [({ data, operation, originalDoc }) => validateContentChange(data, operation, originalDoc)] },
})

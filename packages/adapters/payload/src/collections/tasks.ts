import { COLLECTIONS, FIELDS } from '../contracts/names'
import { resolveActor } from '../access/actor'
import { APIError, type CollectionBeforeChangeHook } from 'payload'
import {
  ADMIN_GROUPS,
  customDataField,
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

function effective(next: Record<string, unknown>, previous: Record<string, unknown>, field: string): unknown {
  return next[field] === undefined ? previous[field] : next[field]
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
    relationshipTo(FIELDS.group, COLLECTIONS.groups),
    epochMs('startAt'),
    epochMs('dueAt', { index: true }),
    epochMs('completedAt'),
    customDataField(),
  ],
  indexes: [{ fields: [FIELDS.project, 'stageId', 'rank'] }, { fields: ['relatedType', 'relatedId'] }],
  hooks: { beforeChange: [enforceTaskProfile] },
})

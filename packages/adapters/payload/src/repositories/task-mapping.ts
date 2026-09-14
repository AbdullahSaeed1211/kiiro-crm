/* eslint-disable */
import type { Id } from '@ops/kernel'
import type { ProjectRecord, TaskRecord, WorkTaskRecord } from '@ops/module-work'
import type { StageCategory, StageTrackedRecord } from '@ops/platform'
import { PRIORITY_VALUES } from '../collections/values'
import { FIELDS, RECORD_TYPES } from '../contracts/names'
import { fieldOf, idOf, idsOf, msOf, numberOf, oneOf, textOf, type Doc } from './documents'

interface StageState {
  readonly id: Id
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
  readonly updatedAt: number
}

type Ownership = Pick<StageTrackedRecord, 'ownerId' | 'assigneeIds' | 'groupId'>

function stageStateOf(doc: Doc): StageState | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const workflowId = idOf(fieldOf(doc, 'workflow'))
  const stageId = idOf(fieldOf(doc, 'stageId'))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  if (id === undefined || workflowId === undefined || stageId === undefined || updatedAt === undefined) return undefined
  // A record without a stage entry time has been in its stage since it was created.
  const stageEnteredAt = numberOf(doc, 'stageEnteredAt') ?? msOf(fieldOf(doc, 'createdAt')) ?? updatedAt
  return { id, workflowId, stageId, stageEnteredAt, updatedAt }
}

function taskOwnership(doc: Doc): Ownership {
  const assigneeIds = idsOf(fieldOf(doc, FIELDS.assignees))
  const groupId = idOf(fieldOf(doc, FIELDS.group))
  return groupId === undefined ? { assigneeIds } : { assigneeIds, groupId }
}

// Project members pass the staff scope of projects, so `can` sees them as assignees.
function projectOwnership(doc: Doc): Ownership {
  const assigneeIds = idsOf(fieldOf(doc, FIELDS.members))
  const ownerId = idOf(fieldOf(doc, FIELDS.owner))
  return ownerId === undefined ? { assigneeIds } : { assigneeIds, ownerId }
}

/** Maps a tasks document to a `TaskRecord`; `undefined` for a task without workflow, stage or timestamps. */
export function toTaskRecord(doc: Doc): TaskRecord | undefined {
  const state = stageStateOf(doc)
  if (state === undefined) return undefined
  return {
    ...state,
    title: textOf(doc, 'title') ?? '',
    priority: oneOf(PRIORITY_VALUES, fieldOf(doc, 'priority')) ?? 'none',
    assigneeIds: idsOf(fieldOf(doc, FIELDS.assignees)),
    startAt: numberOf(doc, 'startAt'),
    dueAt: numberOf(doc, 'dueAt'),
  }
}

/** Maps a work project after its workflow stage category has been resolved. */
export function toProjectRecord(doc: Doc, stageCategory: StageCategory): ProjectRecord | undefined {
  const state = stageStateOf(doc)
  if (state === undefined) return undefined
  return {
    ...state,
    name: textOf(doc, 'name') ?? '',
    organizationId: idOf(fieldOf(doc, 'organization')) ?? null,
    ownerId: idOf(fieldOf(doc, FIELDS.owner)) ?? null,
    memberIds: idsOf(fieldOf(doc, FIELDS.members)),
    stageCategory,
    startAt: numberOf(doc, 'startAt'),
    targetEndAt: numberOf(doc, 'targetEndAt'),
    description: textOf(doc, 'description') ?? null,
    createdAt: msOf(fieldOf(doc, 'createdAt')) ?? state.updatedAt,
  }
}

/** Maps a work task after its workflow stage category has been resolved. */
export function toWorkTaskRecord(doc: Doc, stageCategory: StageCategory): WorkTaskRecord | undefined {
  const base = toTaskRecord(doc)
  const state = stageStateOf(doc)
  if (base === undefined || state === undefined) return undefined
  return {
    ...base,
    description: textOf(doc, 'description') ?? null,
    projectId: idOf(fieldOf(doc, FIELDS.project)) ?? null,
    relatedType: textOf(doc, 'relatedType') ?? null,
    relatedId: idOf(fieldOf(doc, 'relatedId')) ?? null,
    parentTaskId: idOf(fieldOf(doc, 'parentTask')) ?? null,
    rank: textOf(doc, 'rank') ?? '',
    groupId: idOf(fieldOf(doc, FIELDS.group)) ?? null,
    completedAt: numberOf(doc, 'completedAt'),
    createdAt: msOf(fieldOf(doc, 'createdAt')) ?? state.updatedAt,
    stageCategory,
  }
}

/** Maps a tasks or projects document to the platform's stage-tracked view of record `type`. */
export function toStageRecord(type: string, doc: Doc): StageTrackedRecord | undefined {
  const state = stageStateOf(doc)
  if (state === undefined) return undefined
  const { id, ...stage } = state
  const ownership = type === RECORD_TYPES.projects ? projectOwnership(doc) : taskOwnership(doc)
  return { ref: { type, id }, ...stage, ...ownership }
}

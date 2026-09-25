import type { ProjectDraft, ProjectPatch, TaskDatePatch, TaskDraft, TaskPatch } from '@ops/module-work'

/** Persisted field name for a patch key, with an optional value conversion. */
type FieldMap = Readonly<Record<string, readonly [field: string, convert?: (value: unknown) => unknown]>>

const DEFAULT_RANK = '000000000001'
const has = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)
const orNull = (value: unknown): unknown => value ?? null
const toList = (value: unknown): unknown[] => [...((value as readonly unknown[] | undefined) ?? [])]

const PROJECT_PATCH_FIELDS: FieldMap = {
  name: ['name'],
  organizationId: ['organization', orNull],
  startAt: ['startAt'],
  targetEndAt: ['targetEndAt'],
  description: ['description'],
  memberIds: ['members', toList],
}
const TASK_PATCH_FIELDS: FieldMap = {
  title: ['title'],
  description: ['description'],
  priority: ['priority'],
  assigneeIds: ['assignees', toList],
  groupId: ['group', orNull],
  relatedType: ['relatedType'],
  relatedId: ['relatedId'],
}

/** Maps each key present on `patch` to its persisted field; absent keys are left untouched. */
function presentFields(patch: object, fields: FieldMap): Record<string, unknown> {
  const values = patch as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => has(patch, key))
      .map(([key, [field, convert]]) => [field, convert === undefined ? values[key] : convert(values[key])]),
  )
}

export function projectData(draft: ProjectDraft): Record<string, unknown> {
  return {
    name: draft.name,
    organization: draft.organizationId ?? null,
    owner: draft.ownerId ?? null,
    members: [...(draft.memberIds ?? [])],
    workflow: draft.workflowId,
    stageId: draft.stageId,
    ...(draft.startAt === undefined ? {} : { startAt: draft.startAt }),
    ...(draft.targetEndAt === undefined ? {} : { targetEndAt: draft.targetEndAt }),
    ...(draft.description === undefined ? {} : { description: draft.description }),
  }
}

export function taskData(draft: TaskDraft): Record<string, unknown> {
  return {
    title: draft.title,
    description: orNull(draft.description),
    project: orNull(draft.projectId),
    relatedType: orNull(draft.relatedType),
    relatedId: orNull(draft.relatedId),
    parentTask: orNull(draft.parentTaskId),
    workflow: draft.workflowId,
    stageId: draft.stageId,
    rank: draft.rank ?? DEFAULT_RANK,
    priority: draft.priority ?? 'none',
    assignees: toList(draft.assigneeIds),
    group: orNull(draft.groupId),
    startAt: orNull(draft.startAt),
    dueAt: orNull(draft.dueAt),
    completedAt: orNull(draft.completedAt),
  }
}

export function projectPatchData(patch: ProjectPatch): Record<string, unknown> {
  return presentFields(patch, PROJECT_PATCH_FIELDS)
}

/** A date patch writes both dates; any other patch writes only the editable keys it carries. */
export function taskPatchData(patch: TaskPatch | TaskDatePatch): Record<string, unknown> {
  if (has(patch, 'startAt') || has(patch, 'dueAt')) {
    const dates = patch as TaskDatePatch
    return { startAt: dates.startAt, dueAt: dates.dueAt }
  }
  return presentFields(patch, TASK_PATCH_FIELDS)
}

import { ok, type Id } from '@ops/kernel'
import type { TaskDraft, TaskPatch, WorkDeps, WorkResult, WorkTaskRecord } from '../ports/work'
import type { ParsedTaskDraft } from './task-input'
import { fail, isManagerUp } from './input'

async function activeMembers(deps: WorkDeps, ids: readonly Id[]): Promise<boolean> {
  for (const id of ids) {
    if (id === deps.actor.id) {
      if (!deps.actor.active) return false
      continue
    }
    if (deps.isActiveUser === undefined || !(await deps.isActiveUser(id))) return false
  }
  return true
}

function groupAllowed(deps: WorkDeps, groupId: Id | null): boolean {
  return isManagerUp(deps.actor) || groupId === null || deps.actor.groupIds.includes(groupId)
}

function requestedAssignees(draft: ParsedTaskDraft, actorId: Id): readonly Id[] {
  if (draft.primaryAssigneeId !== null) return [draft.primaryAssigneeId, ...draft.collaboratorIds]
  if (draft.primaryAssigneeProvided) return draft.collaboratorIds
  return draft.assigneeIds.length > 0 ? draft.assigneeIds : [actorId]
}

/** Validates all responsibility roles for a new task, while returning the legacy-compatible assignee union. */
export async function authorizeNewResponsibility(
  deps: WorkDeps,
  draft: ParsedTaskDraft,
): Promise<WorkResult<readonly Id[]>> {
  const assigneeIds = requestedAssignees(draft, deps.actor.id)
  const participants = [...assigneeIds, ...draft.watcherIds]
  if (new Set(participants).size !== participants.length)
    return fail('VALIDATION', 'task participants must be distinct')
  if (!groupAllowed(deps, draft.groupId)) return fail('FORBIDDEN', 'cannot assign task outside your group')
  if (!(await activeMembers(deps, participants))) return fail('FORBIDDEN', 'assignees must be active tenant members')
  if (draft.waitingOnId !== null && !(await activeMembers(deps, [draft.waitingOnId])))
    return fail('FORBIDDEN', 'waiting person must be an active tenant member')
  return ok(assigneeIds)
}

function effectiveWaitingOn(patch: TaskPatch, task: WorkTaskRecord): Id | null {
  if (patch.blockedReason === null && patch.waitingOnId === undefined) return null
  return patch.waitingOnId === undefined ? task.waitingOnId : patch.waitingOnId
}

function effectiveBlockedReason(patch: TaskPatch, task: WorkTaskRecord): string | null {
  return patch.blockedReason === undefined ? task.blockedReason : patch.blockedReason
}

function effectiveAssignees(patch: TaskPatch, task: WorkTaskRecord): readonly Id[] {
  if (patch.primaryAssigneeId !== undefined || patch.collaboratorIds !== undefined) {
    const primary = patch.primaryAssigneeId === undefined ? task.primaryAssigneeId : patch.primaryAssigneeId
    return [...(primary === null ? [] : [primary]), ...(patch.collaboratorIds ?? task.collaboratorIds)]
  }
  return patch.assigneeIds ?? task.assigneeIds
}

function normalizeTaskPatch(input: TaskPatch): TaskPatch {
  const withLegacyRoles =
    input.assigneeIds !== undefined && input.primaryAssigneeId === undefined && input.collaboratorIds === undefined
      ? { ...input, primaryAssigneeId: input.assigneeIds[0] ?? null, collaboratorIds: input.assigneeIds.slice(1) }
      : input
  const { assigneeIds, ...withoutLegacy } = withLegacyRoles
  if (
    assigneeIds !== undefined &&
    (withLegacyRoles.primaryAssigneeId !== undefined || withLegacyRoles.collaboratorIds !== undefined)
  )
    return withoutLegacy
  return withLegacyRoles
}

function assignmentTouched(patch: TaskPatch): boolean {
  return (
    patch.assigneeIds !== undefined ||
    patch.primaryAssigneeId !== undefined ||
    patch.collaboratorIds !== undefined ||
    patch.watcherIds !== undefined ||
    patch.groupId !== undefined
  )
}

async function validateTaskParticipants(
  deps: WorkDeps,
  patch: TaskPatch,
  task: WorkTaskRecord,
): Promise<WorkResult<null>> {
  const shape = validateAssignmentShape(deps, patch, task)
  if (!shape.ok) return shape
  const participants = assignmentParticipants(patch, task)
  return (await activeMembers(deps, participants))
    ? ok(null)
    : fail('FORBIDDEN', 'assignees must be active tenant members')
}

function validateAssignmentShape(deps: WorkDeps, patch: TaskPatch, task: WorkTaskRecord): WorkResult<null> {
  const groupId = patch.groupId === undefined ? task.groupId : patch.groupId
  if (assignmentTouched(patch) && !groupAllowed(deps, groupId))
    return fail('FORBIDDEN', 'cannot assign task outside your group')
  const assignees = effectiveAssignees(patch, task)
  const watchers = patch.watcherIds ?? task.watcherIds
  if (new Set([...assignees, ...watchers]).size !== assignees.length + watchers.length)
    return fail('VALIDATION', 'task participants must be distinct')
  const waitingOn = effectiveWaitingOn(patch, task)
  if (waitingOn !== null && effectiveBlockedReason(patch, task) === null)
    return fail('VALIDATION', 'a waiting person requires a blocked reason')
  return ok(null)
}

function assignmentParticipants(patch: TaskPatch, task: WorkTaskRecord): readonly Id[] {
  const waitingOn = effectiveWaitingOn(patch, task)
  return [
    ...effectiveAssignees(patch, task),
    ...(patch.watcherIds ?? task.watcherIds),
    ...(waitingOn === null ? [] : [waitingOn]),
  ]
}

/** Validates editable responsibility and blocked-state fields, returning a normalized internal patch. */
export async function prepareResponsibilityPatch(
  deps: WorkDeps,
  input: TaskPatch,
  task: WorkTaskRecord,
): Promise<WorkResult<{ readonly patch: TaskPatch; readonly changed: boolean }>> {
  const patch = normalizeTaskPatch(input)
  const valid = await validateTaskParticipants(deps, patch, task)
  if (!valid.ok) return valid
  return ok({ patch, changed: JSON.stringify(effectiveAssignees(patch, task)) !== JSON.stringify(task.assigneeIds) })
}

/** Writes the legacy assignee union and authoritative assigner to the same CAS as the role fields. */
export function withAssignmentActor(task: WorkTaskRecord, patch: TaskPatch, actorId: Id): TaskPatch {
  const primary = patch.primaryAssigneeId === undefined ? task.primaryAssigneeId : patch.primaryAssigneeId
  const collaborators = patch.collaboratorIds ?? task.collaboratorIds
  return {
    ...patch,
    assigneeIds: [...(primary === null ? [] : [primary]), ...collaborators],
    assignedById: actorId,
  }
}

/** Preserves participants for the next occurrence while clearing the completed occurrence's blocker. */
export function recurringResponsibility(
  task: WorkTaskRecord,
): Pick<
  TaskDraft,
  'primaryAssigneeId' | 'collaboratorIds' | 'watcherIds' | 'assignedById' | 'blockedReason' | 'waitingOnId'
> {
  return {
    primaryAssigneeId: task.primaryAssigneeId,
    collaboratorIds: task.collaboratorIds,
    watcherIds: task.watcherIds,
    assignedById: task.assignedById,
    blockedReason: null,
    waitingOnId: null,
  }
}

/** Notifies responsible recipients added by one committed assignment change. */
export async function notifyAddedAssignees(
  deps: WorkDeps,
  input: { readonly before: WorkTaskRecord; readonly after: WorkTaskRecord; readonly changed: boolean },
): Promise<void> {
  if (!input.changed || deps.notifyAssignment === undefined) return
  const previous = new Set(input.before.assigneeIds)
  const added = input.after.assigneeIds.filter((id) => !previous.has(id) && id !== deps.actor.id)
  if (added.length > 0) await deps.notifyAssignment(input.after, added)
}

/** Notifies initial assignees except the authenticated creator. */
export async function notifyCreatedAssignees(deps: WorkDeps, task: WorkTaskRecord): Promise<void> {
  if (deps.notifyAssignment === undefined) return
  const recipients = task.assigneeIds.filter((id) => id !== deps.actor.id)
  if (recipients.length > 0) await deps.notifyAssignment(task, recipients)
}

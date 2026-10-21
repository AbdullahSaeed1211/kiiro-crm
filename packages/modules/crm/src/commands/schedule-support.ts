import { asId, type Id } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import type { ScheduleItemRecord } from '../ports/records'
import type { CrmDeps } from '../ports/repository'
import { accessDenied, failure } from '../domain/helpers'

/** Shared parent fields needed to authorize and synchronize schedule items. */
export interface ScheduleParent {
  readonly ownerId: Id | null
  readonly assigneeIds?: readonly Id[]
  readonly nextActionAt?: number | null
  readonly updatedAt: number
}

function parentAssignment(parent: ScheduleParent): Id[] {
  return [...new Set([...(parent.ownerId === null ? [] : [parent.ownerId]), ...(parent.assigneeIds ?? [])])]
}

/** Reads a schedule parent through the caller-scoped repository and returns a safe not-found result when hidden. */
export async function authorizedScheduleParent(deps: CrmDeps, type: ScheduleItemRecord['recordType'], id: Id) {
  const record = await deps.repo.get(type, id)
  if (record === undefined) return { record: undefined, error: failure('NOT_FOUND', `${type} not found`) }
  const denied = accessDenied<never>({ type, deps, record })
  return denied === undefined ? { record, error: undefined } : { record: undefined, error: denied }
}

function assignmentAllowed(deps: CrmDeps, parent: ScheduleParent, values: readonly string[]): boolean {
  if (!isManagerUp(deps.actor)) return values.every((value) => value === deps.actor.id)
  const parentPeople = new Set(parentAssignment(parent))
  if (isManagerUp(deps.actor)) parentPeople.add(deps.actor.id)
  return values.every((value) => parentPeople.has(asId(value)))
}

/** Validates requested assignees against parent access, actor permissions, and active-user status. */
export async function resolveScheduleAssignees(input: {
  readonly deps: CrmDeps
  readonly parent: ScheduleParent
  readonly recordType: 'lead' | 'contact'
  readonly requested?: readonly string[] | undefined
}) {
  const { deps, parent, recordType, requested } = input
  const values = requested ?? (isManagerUp(deps.actor) ? parentAssignment(parent) : [deps.actor.id])
  if (!assignmentAllowed(deps, parent, values)) return undefined
  const unique = [...new Set(values.map(asId))]
  const active = await Promise.all(unique.map((userId) => deps.repo.isActiveUser(userId, recordType)))
  if (active.some((isActive) => !isActive)) return undefined
  return unique
}

/** Keeps a lead's legacy next-action field aligned with its canonical callback schedule item. */
export async function syncLeadCallback(input: {
  deps: CrmDeps
  recordId: Id
  startsAt: number | null
  currentParent: ScheduleParent
  scheduleItem: ScheduleItemRecord
}): Promise<boolean> {
  const { deps, recordId, startsAt, currentParent, scheduleItem } = input
  if (currentParent.nextActionAt === startsAt) return true
  const first = await deps.repo.update('lead', recordId, { nextActionAt: startsAt }, currentParent.updatedAt)
  if (first !== undefined) return true
  // Schedule items are canonical; a fresh CAS can repair only the compatibility mirror after a concurrent edit.
  const currentSchedule = await deps.repo.getScheduleItem(scheduleItem.id)
  if (currentSchedule?.updatedAt !== scheduleItem.updatedAt) return false
  const latest = await deps.repo.get('lead', recordId)
  if (latest === undefined) return false
  const parent = latest as unknown as ScheduleParent
  if (parent.nextActionAt === startsAt) return true
  return (await deps.repo.update('lead', recordId, { nextActionAt: startsAt }, parent.updatedAt)) !== undefined
}

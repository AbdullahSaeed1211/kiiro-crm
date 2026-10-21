import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import type { WorkDeps, WorkResult } from '../ports/work'

/** Shared audit record type for project-owned agency work. */
export const PROJECT_RECORD = 'project' as const
/** Activity verb used when an agency work item changes. */
export const FIELD_CHANGED = 'field.changed' as const
/** Validation message when a project has nobody eligible to own new work. */
const NO_PROJECT_MEMBER = 'Add a project member before assigning this item.'
/** Validation message when an owner is not an active project member. */
export const INVALID_PROJECT_MEMBER = 'Choose someone responsible for this project.'
/** Validation message for incomplete scheduled or published content. */
export const INVALID_SCHEDULE = 'Scheduled content needs a date and channel.'

/** Converts forbidden command outcomes to the shared work result shape. */
export const forbidden = (message: string): WorkResult<never> => err(domainError('FORBIDDEN', message))
/** Converts missing records to the shared work result shape. */
export const notFound = (name: string): WorkResult<never> => err(domainError('NOT_FOUND', `${name} not found`))
/** Returns a version conflict requiring the caller to reload the changed item. */
export const conflict = (): WorkResult<never> =>
  err(domainError('CONFLICT', 'This item changed. Refresh and try again.'))

/** Normalizes blank optional free text to null. */
export function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length === 0 ? null : trimmed
}

/** Loads a project only when the actor has its normal project-update permission. */
export async function editableProject(deps: WorkDeps, projectId: Id) {
  const project = await deps.repo.getProject(projectId)
  if (project === undefined) return undefined
  return deps.can(deps.actor, 'update', {
    type: PROJECT_RECORD,
    ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
    assigneeIds: project.memberIds,
  })
    ? project
    : undefined
}

/** Checks whether a user is the project owner or an assigned member. */
function projectStaff(project: { readonly ownerId: Id | null; readonly memberIds: readonly Id[] }, userId: Id) {
  return project.ownerId === userId || project.memberIds.includes(userId)
}

/** Checks project membership and, when available, the user's active staff status. */
export async function activeProjectStaff(
  deps: WorkDeps,
  project: { readonly ownerId: Id | null; readonly memberIds: readonly Id[] },
  userId: Id,
): Promise<boolean> {
  if (!projectStaff(project, userId)) return false
  return deps.isActiveUser === undefined || (await deps.isActiveUser(userId))
}

/** Chooses the current staff member or validates a requested active project owner. */
export async function responsibleOwner(input: {
  readonly deps: WorkDeps
  readonly project: { readonly ownerId: Id | null; readonly memberIds: readonly Id[] }
  readonly actorId: Id
  readonly requestedOwner?: string
}): Promise<WorkResult<Id>> {
  const { deps, project, actorId, requestedOwner } = input
  const requestedId = requestedOwner === undefined ? actorId : asId(requestedOwner)
  if (requestedOwner !== undefined && !projectStaff(project, requestedId)) return forbidden(INVALID_PROJECT_MEMBER)
  const ownerId = projectStaff(project, requestedId) ? requestedId : (project.ownerId ?? project.memberIds[0])
  if (ownerId === undefined) return forbidden(NO_PROJECT_MEMBER)
  if (!(await activeProjectStaff(deps, project, ownerId))) return forbidden(INVALID_PROJECT_MEMBER)
  return ok(ownerId)
}

/** Requires publish timing and channel metadata outside of the draft state. */
export function validContentSchedule(
  status: string | undefined,
  publishAt: number | null | undefined,
  channel: string | null,
): boolean {
  return status === 'draft' || (typeof publishAt === 'number' && channel !== null)
}

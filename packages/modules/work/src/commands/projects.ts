/* eslint-disable */
import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import type { ProjectPatch, ProjectRecord, WorkDeps, WorkResult } from '../ports/work'

const CONFLICT = 'project was updated by someone else'
const NOT_FOUND = 'project not found'
const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))
const objectInput = (input: unknown): Record<string, unknown> | undefined =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : undefined
const projectResource = (project: ProjectRecord) => ({
  type: 'project',
  ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
  assigneeIds: project.memberIds,
})
const isManagerUp = (actor: Actor): boolean => actor.role === 'owner' || actor.role === 'manager'
const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200
const validDate = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))
const idsOf = (value: unknown): Id[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').map(asId) : []
const CREATE_FIELDS = new Set([
  'name',
  'organizationId',
  'ownerId',
  'memberIds',
  'startAt',
  'targetEndAt',
  'description',
])

function allowedMembers(deps: WorkDeps, memberIds: readonly Id[]): boolean {
  return isManagerUp(deps.actor) || memberIds.every((memberId) => memberId === deps.actor.id)
}

async function relatedVisible(deps: WorkDeps, type: string, id: Id): Promise<boolean> {
  if (isManagerUp(deps.actor)) return true
  return (await deps.readRecord?.(type, id)) === true
}

async function organizationAllowed(deps: WorkDeps, organizationId: Id | null): Promise<boolean> {
  return organizationId === null || (await relatedVisible(deps, 'organization', organizationId))
}

function parseProjectPatch(input: unknown): ProjectPatch | undefined {
  const value = objectInput(input)
  if (value === undefined) return undefined
  const keys = new Set(['name', 'organizationId', 'startAt', 'targetEndAt', 'description'])
  if (Object.keys(value).some((key) => !keys.has(key))) return undefined
  if ('name' in value && !validName(value['name'])) return undefined
  if ('organizationId' in value && value['organizationId'] !== null && typeof value['organizationId'] !== 'string')
    return undefined
  if (['startAt', 'targetEndAt'].some((key) => key in value && !validDate(value[key]))) return undefined
  if ('description' in value && value['description'] !== null && typeof value['description'] !== 'string')
    return undefined
  return {
    ...('name' in value ? { name: (value['name'] as string).trim() } : {}),
    ...('organizationId' in value
      ? { organizationId: value['organizationId'] === null ? null : asId(value['organizationId'] as string) }
      : {}),
    ...('startAt' in value ? { startAt: value['startAt'] as number | null } : {}),
    ...('targetEndAt' in value ? { targetEndAt: value['targetEndAt'] as number | null } : {}),
    ...('description' in value ? { description: value['description'] as string | null } : {}),
  }
}

/** Creates a project after checking create, ownership, membership, and organization scope. */
export async function createProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const value = objectInput(input)
  if (value === undefined || !validName(value['name'])) return fail('VALIDATION', 'a project name is required')
  if (Object.keys(value).some((key) => !CREATE_FIELDS.has(key)))
    return fail('VALIDATION', 'project contains unsupported fields')
  if ('organizationId' in value && value['organizationId'] !== null && typeof value['organizationId'] !== 'string')
    return fail('VALIDATION', 'organizationId is invalid')
  if ('ownerId' in value && value['ownerId'] !== null && typeof value['ownerId'] !== 'string')
    return fail('VALIDATION', 'ownerId is invalid')
  if (
    'memberIds' in value &&
    (!Array.isArray(value['memberIds']) || value['memberIds'].some((id) => typeof id !== 'string'))
  )
    return fail('VALIDATION', 'memberIds is invalid')
  if (['startAt', 'targetEndAt'].some((key) => key in value && !validDate(value[key])))
    return fail('VALIDATION', 'project dates are invalid')
  if (
    'description' in value &&
    value['description'] !== null &&
    (typeof value['description'] !== 'string' || value['description'].length > 20_000)
  )
    return fail('VALIDATION', 'project description is invalid')
  if (
    typeof value['startAt'] === 'number' &&
    typeof value['targetEndAt'] === 'number' &&
    value['startAt'] > value['targetEndAt']
  )
    return fail('VALIDATION', 'startAt must not be after targetEndAt')
  if (!deps.can(deps.actor, 'create', { type: 'project' })) return fail('FORBIDDEN', 'not allowed to create projects')
  const ownerId = typeof value['ownerId'] === 'string' ? asId(value['ownerId']) : deps.actor.id
  const memberIds = idsOf(value['memberIds'])
  if (!isManagerUp(deps.actor) && ownerId !== deps.actor.id) return fail('FORBIDDEN', 'cannot assign project owner')
  if (!allowedMembers(deps, memberIds)) return fail('FORBIDDEN', 'cannot assign project members')
  const organizationId = typeof value['organizationId'] === 'string' ? asId(value['organizationId']) : null
  if (!(await organizationAllowed(deps, organizationId))) return fail('FORBIDDEN', 'organization is outside your scope')
  const workflow = await deps.repo.loadDefaultWorkflow('project')
  return ok(
    await deps.repo.createProject({
      name: value['name'].trim(),
      ownerId,
      organizationId,
      memberIds,
      workflowId: workflow.id,
      stageId: workflow.defaultStageId,
    }),
  )
}

/** Updates only editable project fields; stage, owner, and membership use dedicated commands. */
export async function updateProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const value = objectInput(input)
  if (
    value === undefined ||
    typeof value['projectId'] !== 'string' ||
    typeof value['expectedUpdatedAt'] !== 'number' ||
    !Number.isFinite(value['expectedUpdatedAt'])
  )
    return fail('VALIDATION', 'projectId and expectedUpdatedAt are required')
  const patch = parseProjectPatch(value['patch'])
  if (patch === undefined) return fail('VALIDATION', 'project patch contains unsupported or invalid fields')
  const project = await deps.repo.getProject(asId(value['projectId']))
  if (project === undefined) return fail('NOT_FOUND', NOT_FOUND)
  if (!deps.can(deps.actor, 'update', projectResource(project)))
    return fail('FORBIDDEN', 'not allowed to update project')
  if (!(await organizationAllowed(deps, patch.organizationId ?? project.organizationId)))
    return fail('FORBIDDEN', 'organization is outside your scope')
  const saved = await deps.repo.updateProject(project.id, patch, value['expectedUpdatedAt'])
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

/** Adds one visible member to a project with assignment authorization and compare-and-set protection. */
export async function addProjectMember(
  deps: WorkDeps,
  input: { readonly projectId: Id; readonly memberId: Id; readonly expectedUpdatedAt: number },
): Promise<WorkResult<ProjectRecord>> {
  const project = await deps.repo.getProject(input.projectId)
  if (project === undefined) return fail('NOT_FOUND', NOT_FOUND)
  if (!deps.can(deps.actor, 'assign', projectResource(project)) || !allowedMembers(deps, [input.memberId]))
    return fail('FORBIDDEN', 'not allowed to assign project members')
  const saved = await deps.repo.updateProject(
    input.projectId,
    { memberIds: [...new Set([...project.memberIds, input.memberId])] },
    input.expectedUpdatedAt,
  )
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

/** Removes one member from a project with update authorization and compare-and-set protection. */
export async function removeProjectMember(
  deps: WorkDeps,
  input: { readonly projectId: Id; readonly memberId: Id; readonly expectedUpdatedAt: number },
): Promise<WorkResult<ProjectRecord>> {
  const project = await deps.repo.getProject(input.projectId)
  if (project === undefined) return fail('NOT_FOUND', NOT_FOUND)
  if (!deps.can(deps.actor, 'update', projectResource(project)))
    return fail('FORBIDDEN', 'not allowed to update project')
  const saved = await deps.repo.updateProject(
    input.projectId,
    { memberIds: project.memberIds.filter((id) => id !== input.memberId) },
    input.expectedUpdatedAt,
  )
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

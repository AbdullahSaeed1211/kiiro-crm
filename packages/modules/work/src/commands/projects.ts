import { asId, ok, type Id } from '@ops/kernel'
import type { ProjectPatch, ProjectRecord, WorkDeps, WorkResult } from '../ports/work'
import { fail, isManagerUp, objectInput, validDate } from './input'

type Fields = Record<string, unknown>
type Check = readonly [valid: (value: Fields) => boolean, message: string]

const CONFLICT = 'project was updated by someone else'
const NOT_FOUND = 'project not found'
const CREATE_FIELDS = new Set([
  'name',
  'organizationId',
  'ownerId',
  'memberIds',
  'startAt',
  'targetEndAt',
  'description',
])
const projectResource = (project: ProjectRecord) => ({
  type: 'project',
  ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
  assigneeIds: project.memberIds,
})
const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200
const nullableString = (value: unknown): boolean => value === null || typeof value === 'string'
const validDescription = (value: unknown): boolean =>
  value === null || (typeof value === 'string' && value.length <= 20_000)
const stringList = (value: unknown): boolean => Array.isArray(value) && value.every((id) => typeof id === 'string')
/** Returns whether `key` is absent or passes `valid`. */
const absentOr =
  (key: string, valid: (field: unknown) => boolean) =>
  (value: Fields): boolean =>
    !(key in value) || valid(value[key])
const idOrNull = (value: unknown): Id | null => (typeof value === 'string' ? asId(value) : null)
const numberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const idsOf = (value: unknown): Id[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').map(asId) : []

/** Create-input checks, in the order their messages take precedence. */
const CREATE_CHECKS: readonly Check[] = [
  [(value) => Object.keys(value).every((key) => CREATE_FIELDS.has(key)), 'project contains unsupported fields'],
  [absentOr('organizationId', nullableString), 'organizationId is invalid'],
  [absentOr('ownerId', nullableString), 'ownerId is invalid'],
  [absentOr('memberIds', stringList), 'memberIds is invalid'],
  [
    (value) => absentOr('startAt', validDate)(value) && absentOr('targetEndAt', validDate)(value),
    'project dates are invalid',
  ],
  [absentOr('description', validDescription), 'project description is invalid'],
  [
    ({ startAt, targetEndAt }) =>
      !(typeof startAt === 'number' && typeof targetEndAt === 'number' && startAt > targetEndAt),
    'startAt must not be after targetEndAt',
  ],
]

/** Validators for each editable project field; any other key makes a patch invalid. */
const PATCH_CHECKS = new Map<string, (field: unknown) => boolean>([
  ['name', validName],
  ['organizationId', nullableString],
  ['startAt', validDate],
  ['targetEndAt', validDate],
  ['description', nullableString],
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
  if (!Object.entries(value).every(([key, field]) => PATCH_CHECKS.get(key)?.(field) === true)) return undefined
  const { name, organizationId, ...dates } = value
  return {
    ...(dates as Pick<ProjectPatch, 'startAt' | 'targetEndAt' | 'description'>),
    ...('name' in value ? { name: (name as string).trim() } : {}),
    ...('organizationId' in value ? { organizationId: idOrNull(organizationId) } : {}),
  }
}

interface ProjectDraft {
  readonly name: string
  readonly ownerId: Id
  readonly organizationId: Id | null
  readonly memberIds: readonly Id[]
  readonly startAt: number | null
  readonly targetEndAt: number | null
  readonly description: string | null
}

/** Maps validated create input to a draft; the owner defaults to the actor. */
function projectDraft(value: Fields, actorId: Id): ProjectDraft {
  const { name, ownerId, organizationId, memberIds, startAt, targetEndAt, description } = value
  return {
    name: (name as string).trim(),
    ownerId: idOrNull(ownerId) ?? actorId,
    organizationId: idOrNull(organizationId),
    memberIds: idsOf(memberIds),
    startAt: numberOrNull(startAt),
    targetEndAt: numberOrNull(targetEndAt),
    description: typeof description === 'string' ? description.trim() : null,
  }
}

async function createDenial(deps: WorkDeps, draft: ProjectDraft): Promise<WorkResult<never> | undefined> {
  if (!isManagerUp(deps.actor) && draft.ownerId !== deps.actor.id)
    return fail('FORBIDDEN', 'cannot assign project owner')
  if (!allowedMembers(deps, draft.memberIds)) return fail('FORBIDDEN', 'cannot assign project members')
  if (!(await organizationAllowed(deps, draft.organizationId)))
    return fail('FORBIDDEN', 'organization is outside your scope')
  return undefined
}

/** Creates a project after checking create, ownership, membership, and organization scope. */
export async function createProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const value = objectInput(input)
  if (value === undefined || !validName(value['name'])) return fail('VALIDATION', 'a project name is required')
  const invalid = CREATE_CHECKS.find(([valid]) => !valid(value))
  if (invalid !== undefined) return fail('VALIDATION', invalid[1])
  if (!deps.can(deps.actor, 'create', { type: 'project' })) return fail('FORBIDDEN', 'not allowed to create projects')
  const draft = projectDraft(value, deps.actor.id)
  const denied = await createDenial(deps, draft)
  if (denied !== undefined) return denied
  const workflow = await deps.repo.loadDefaultWorkflow('project')
  return ok(await deps.repo.createProject({ ...draft, workflowId: workflow.id, stageId: workflow.defaultStageId }))
}

interface ProjectUpdate {
  readonly projectId: Id
  readonly expectedUpdatedAt: number
  readonly patch: ProjectPatch
}

function parseProjectUpdate(input: unknown): WorkResult<ProjectUpdate> {
  const value = objectInput(input) ?? {}
  const { projectId, expectedUpdatedAt } = value
  if (typeof projectId !== 'string' || typeof expectedUpdatedAt !== 'number' || !Number.isFinite(expectedUpdatedAt))
    return fail('VALIDATION', 'projectId and expectedUpdatedAt are required')
  const patch = parseProjectPatch(value['patch'])
  if (patch === undefined) return fail('VALIDATION', 'project patch contains unsupported or invalid fields')
  return ok({ projectId: asId(projectId), expectedUpdatedAt, patch })
}

async function updateDenial(
  deps: WorkDeps,
  project: ProjectRecord,
  patch: ProjectPatch,
): Promise<WorkResult<never> | undefined> {
  if (!deps.can(deps.actor, 'update', projectResource(project)))
    return fail('FORBIDDEN', 'not allowed to update project')
  if (!(await organizationAllowed(deps, patch.organizationId ?? project.organizationId)))
    return fail('FORBIDDEN', 'organization is outside your scope')
  return undefined
}

/** Updates only editable project fields; stage, owner, and membership use dedicated commands. */
export async function updateProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const update = parseProjectUpdate(input)
  if (!update.ok) return update
  const { projectId, expectedUpdatedAt, patch } = update.value
  const project = await deps.repo.getProject(projectId)
  if (project === undefined) return fail('NOT_FOUND', NOT_FOUND)
  const denied = await updateDenial(deps, project, patch)
  if (denied !== undefined) return denied
  const saved = await deps.repo.updateProject(project.id, patch, expectedUpdatedAt)
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

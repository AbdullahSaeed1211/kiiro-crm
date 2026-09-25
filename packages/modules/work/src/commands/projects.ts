import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { ProjectPatch, ProjectRecord, WorkDeps, WorkResult } from '../ports/work'
import { createProjectSchema, updateProjectSchema, type CreateProjectInput, type ProjectPatchInput } from '../schema'
import { fail, isManagerUp } from './input'

const CONFLICT = 'project was updated by someone else'
const NOT_FOUND = 'project not found'
const projectResource = (project: ProjectRecord) => ({
  type: 'project',
  ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
  assigneeIds: project.memberIds,
})
const idOrNull = (value: string | null | undefined): Id | null =>
  value === null || value === undefined ? null : asId(value)

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

/** Maps a validated patch to the port shape, keeping only the keys the caller sent. */
function projectPatch(patch: ProjectPatchInput): ProjectPatch {
  const { organizationId, ...plain } = patch
  const copied = Object.fromEntries(Object.entries(plain).filter(([, value]) => value !== undefined))
  return {
    ...(copied as Pick<ProjectPatch, 'name' | 'startAt' | 'targetEndAt' | 'description'>),
    ...(organizationId === undefined ? {} : { organizationId: idOrNull(organizationId) }),
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
function projectDraft(value: CreateProjectInput, actorId: Id): ProjectDraft {
  return {
    name: value.name,
    ownerId: idOrNull(value.ownerId) ?? actorId,
    organizationId: idOrNull(value.organizationId),
    memberIds: (value.memberIds ?? []).map(asId),
    startAt: value.startAt ?? null,
    targetEndAt: value.targetEndAt ?? null,
    description: value.description?.trim() ?? null,
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
  const parsed = createProjectSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('project fields are invalid', parsed.error.issues))
  if (!deps.can(deps.actor, 'create', { type: 'project' })) return fail('FORBIDDEN', 'not allowed to create projects')
  const draft = projectDraft(parsed.data, deps.actor.id)
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
  const parsed = updateProjectSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('project update is invalid', parsed.error.issues))
  const { projectId, expectedUpdatedAt, patch } = parsed.data
  return ok({ projectId: asId(projectId), expectedUpdatedAt, patch: projectPatch(patch) })
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

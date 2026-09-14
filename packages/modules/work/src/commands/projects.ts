import { asId, domainError, err, ok, type Id } from '@ops/kernel'
import type { ProjectRecord, WorkDeps, WorkResult } from '../ports/work'

const CONFLICT = 'project was updated by someone else'
const fail = <T>(code: Parameters<typeof domainError>[0], message: string): WorkResult<T> =>
  err(domainError(code, message))
function resource(project: ProjectRecord) {
  return {
    type: 'project',
    ...(project.ownerId === null ? {} : { ownerId: project.ownerId }),
    assigneeIds: project.memberIds,
  }
}
function objectInput(input: unknown): Record<string, unknown> | undefined {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : undefined
}
function validName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200
}

/** Creates a project using the default project workflow. */
export async function createProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const value = objectInput(input)
  if (value === undefined || !validName(value['name'])) return fail('VALIDATION', 'a project name is required')
  const workflow = await deps.repo.loadDefaultWorkflow('project')
  const ownerId = typeof value['ownerId'] === 'string' ? asId(value['ownerId']) : deps.actor.id
  const organizationId = typeof value['organizationId'] === 'string' ? asId(value['organizationId']) : null
  const memberIds = Array.isArray(value['memberIds'])
    ? value['memberIds'].filter((id): id is string => typeof id === 'string').map(asId)
    : []
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

/** Updates a project with compare-and-set protection. */
export async function updateProject(deps: WorkDeps, input: unknown): Promise<WorkResult<ProjectRecord>> {
  const value = objectInput(input)
  if (value === undefined || typeof value['projectId'] !== 'string' || typeof value['expectedUpdatedAt'] !== 'number')
    return fail('VALIDATION', 'projectId and expectedUpdatedAt are required')
  const project = await deps.repo.getProject(asId(value['projectId']))
  if (project === undefined) return fail('NOT_FOUND', 'project not found')
  if (!canUpdate(deps, project)) return fail('FORBIDDEN', 'not allowed to update this project')
  const saved = await deps.repo.updateProject(project.id, value['patch'] ?? {}, value['expectedUpdatedAt'])
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

function canUpdate(deps: WorkDeps, project: ProjectRecord): boolean {
  return deps.can(deps.actor, 'update', resource(project))
}
function canAssign(deps: WorkDeps, project: ProjectRecord): boolean {
  return canUpdate(deps, project) && deps.can(deps.actor, 'assign', resource(project))
}

/** Adds a member to a project with assignment authorization and compare-and-set protection. */
export async function addProjectMember(
  deps: WorkDeps,
  input: { readonly projectId: Id; readonly memberId: Id; readonly expectedUpdatedAt: number },
): Promise<WorkResult<ProjectRecord>> {
  const { projectId, memberId, expectedUpdatedAt } = input
  const project = await deps.repo.getProject(projectId)
  if (project === undefined) return fail('NOT_FOUND', 'project not found')
  if (!canAssign(deps, project)) return fail('FORBIDDEN', 'not allowed to assign this project')
  const saved = await deps.repo.updateProject(
    projectId,
    { memberIds: [...new Set([...project.memberIds, memberId])] },
    expectedUpdatedAt,
  )
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

/** Removes a member from a project with update authorization and compare-and-set protection. */
export async function removeProjectMember(
  deps: WorkDeps,
  input: { readonly projectId: Id; readonly memberId: Id; readonly expectedUpdatedAt: number },
): Promise<WorkResult<ProjectRecord>> {
  const { projectId, memberId, expectedUpdatedAt } = input
  const project = await deps.repo.getProject(projectId)
  if (project === undefined) return fail('NOT_FOUND', 'project not found')
  if (!canUpdate(deps, project)) return fail('FORBIDDEN', 'not allowed to update this project')
  const saved = await deps.repo.updateProject(
    projectId,
    { memberIds: project.memberIds.filter((id) => id !== memberId) },
    expectedUpdatedAt,
  )
  return saved === undefined ? fail('CONFLICT', CONFLICT) : ok(saved)
}

import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { MonthlyDesignConfig, ProjectRecord, WorkDeps, WorkResult } from '../ports/work'
import { configureProjectMonthlyDesignSchema } from '../schema'
import { fail, isManagerUp } from './input'

const CONFLICT = 'project was updated by someone else'

async function validateAssignee(deps: WorkDeps, project: ProjectRecord, id: Id): Promise<boolean> {
  return (await deps.isActiveUser?.(id)) === true && (await deps.canReadProjectAsUser?.(id, project)) === true
}

async function monthlyDesignAssignees(input: {
  readonly deps: WorkDeps
  readonly project: ProjectRecord
  readonly assigneeIds: readonly Id[]
  readonly enabled: boolean
}): Promise<WorkResult<readonly Id[]>> {
  const eligible = new Set([input.project.ownerId, ...input.project.memberIds].filter((id): id is Id => id !== null))
  if (input.assigneeIds.some((id) => !eligible.has(id)))
    return fail('VALIDATION', 'monthly design assignees must be the project owner or members')
  for (const id of input.assigneeIds) {
    if (!(await validateAssignee(input.deps, input.project, id)))
      return fail('VALIDATION', 'monthly design assignees must be active and have project delivery access')
  }
  if (input.enabled && input.assigneeIds.length === 0)
    return fail('VALIDATION', 'assign at least one person before enabling monthly design work')
  return ok(input.assigneeIds)
}

function monthlyDesignConfig(input: {
  readonly settings: ReturnType<typeof configureProjectMonthlyDesignSchema.parse>
  readonly project: ProjectRecord
  readonly assigneeIds: readonly Id[]
  readonly now: number
}): MonthlyDesignConfig {
  const { settings, project, assigneeIds, now } = input
  return {
    enabled: settings.enabled,
    title: settings.title,
    assigneeIds,
    issueDay: settings.issueDay,
    dueDay: settings.dueDay,
    effectiveFrom:
      settings.enabled && project.monthlyDesign?.enabled === true ? project.monthlyDesign.effectiveFrom : now,
  }
}

async function saveMonthlyDesignConfig(input: {
  readonly deps: WorkDeps
  readonly project: ProjectRecord
  readonly config: MonthlyDesignConfig
  readonly expectedUpdatedAt: number
}) {
  return input.deps.uow.run(async () => {
    const saved = await input.deps.repo.updateProjectMonthlyDesign(
      input.project.id,
      input.config,
      input.expectedUpdatedAt,
    )
    if (saved === undefined) return undefined
    await input.deps.repo.addActivity({
      record: { type: 'project', id: input.project.id },
      verb: 'field.changed',
      actorId: input.deps.actor.id,
      occurredAt: input.deps.clock.now(),
      data: { field: 'monthlyDesign', enabled: saved.config.enabled },
    })
    return saved
  })
}

/** Configures opt-in monthly design work orders for a project. */
export async function configureProjectMonthlyDesign(
  deps: WorkDeps,
  input: unknown,
): Promise<WorkResult<{ readonly config: MonthlyDesignConfig; readonly updatedAt: number }>> {
  const parsed = configureProjectMonthlyDesignSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('monthly design settings are invalid', parsed.error.issues))
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'only managers can configure monthly design work')
  const project = await deps.repo.getProject(asId(parsed.data.projectId))
  if (project === undefined) return fail('NOT_FOUND', 'project not found')
  const assigneeIds = [...new Set(parsed.data.assigneeIds.map(asId))]
  const checked = await monthlyDesignAssignees({ deps, project, assigneeIds, enabled: parsed.data.enabled })
  if (!checked.ok) return checked
  const config = monthlyDesignConfig({
    settings: parsed.data,
    project,
    assigneeIds: checked.value,
    now: deps.clock.now(),
  })
  const updated = await saveMonthlyDesignConfig({
    deps,
    project,
    config,
    expectedUpdatedAt: parsed.data.expectedUpdatedAt,
  })
  return updated === undefined ? fail('CONFLICT', CONFLICT) : ok(updated)
}

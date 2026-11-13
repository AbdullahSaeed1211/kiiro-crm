import { asId, invalidInput, ok, err } from '@ops/kernel'
import { TERMINAL_CATEGORIES } from '../domain/rules'
import type { WorkDeps, WorkResult } from '../ports/work'
import { currentFocusSchema } from '../schema'
import { fail } from './input'
import { taskResource } from './task-access'

/** Stores one explicit, self-reported task focus for the signed-in person. */
export async function setCurrentFocus(
  deps: WorkDeps,
  input: unknown,
): Promise<WorkResult<{ readonly taskId: string | null; readonly startedAt: number | null }>> {
  const parsed = currentFocusSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Current focus is invalid.', parsed.error.issues))
  if (parsed.data.action === 'stop') {
    await deps.repo.clearCurrentFocus(deps.actor.id)
    return ok({ taskId: null, startedAt: null })
  }

  const taskId = asId(parsed.data.taskId)
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (!deps.can(deps.actor, 'read', taskResource(task))) return fail('FORBIDDEN', 'task is outside your scope')
  if (!task.assigneeIds.includes(deps.actor.id)) return fail('FORBIDDEN', 'only an assignee can start this task')
  if (TERMINAL_CATEGORIES.has(task.stageCategory)) return fail('VALIDATION', 'completed tasks cannot be started')

  const startedAt = deps.clock.now()
  await deps.repo.saveCurrentFocus({ userId: deps.actor.id, taskId, startedAt })
  return ok({ taskId, startedAt })
}

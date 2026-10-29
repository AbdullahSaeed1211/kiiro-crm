import { asId, ok } from '@ops/kernel'
import { TERMINAL_CATEGORIES } from '../domain/rules'
import { todayAsDueAt } from '../domain/due-dates'
import type { WorkDeps, WorkResult } from '../ports/work'
import { taskResource } from './task-access'
import { taskDayPlanSchema } from '../schema'
import { fail } from './input'

/** Adds an assigned open task to the actor's plan for today, preserving the task's due date. */
export async function addTaskToTodayPlan(
  deps: WorkDeps,
  input: unknown,
  timeZone: string,
): Promise<WorkResult<{ readonly taskId: string; readonly day: number }>> {
  const parsed = taskDayPlanSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'taskId is required')
  const taskId = asId(parsed.data.taskId)
  const task = await deps.repo.getTask(taskId)
  if (task === undefined) return fail('NOT_FOUND', 'task not found')
  if (!deps.can(deps.actor, 'read', taskResource(task))) return fail('FORBIDDEN', 'task is outside your scope')
  if (!task.assigneeIds.includes(deps.actor.id)) return fail('FORBIDDEN', 'only an assignee can plan this task')
  if (TERMINAL_CATEGORIES.has(task.stageCategory)) return fail('VALIDATION', 'completed tasks cannot be planned')
  const day = todayAsDueAt(deps.clock.now(), timeZone)
  await deps.repo.addTaskToDayPlan({ taskId, userId: deps.actor.id, day })
  return ok({ taskId, day })
}

/** Removes only the actor's plan entry for today; it leaves the task and its deadline unchanged. */
export async function removeTaskFromTodayPlan(
  deps: WorkDeps,
  input: unknown,
  timeZone: string,
): Promise<WorkResult<{ readonly taskId: string; readonly day: number }>> {
  const parsed = taskDayPlanSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'taskId is required')
  const taskId = asId(parsed.data.taskId)
  const day = todayAsDueAt(deps.clock.now(), timeZone)
  await deps.repo.removeTaskFromDayPlan({ taskId, userId: deps.actor.id, day })
  return ok({ taskId, day })
}

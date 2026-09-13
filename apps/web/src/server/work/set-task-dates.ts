import { asId, domainError, type DomainError, type ErrorCode } from '@ops/kernel'
import type { WorkDeps } from './task-repository'

const TASK_TYPE = 'task'

/** Input of the `setTaskDates` action; dates are epoch ms. */
export interface SetTaskDatesInput {
  readonly taskId: string
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly expectedUpdatedAt: number
}

/** Saved dates, or the domain error that stopped the change (spec §12). */
export type SetTaskDatesResult =
  | {
      readonly ok: true
      readonly data: { readonly startAt: number | null; readonly dueAt: number | null; readonly updatedAt: number }
    }
  | { readonly ok: false; readonly error: DomainError }

function failure(code: ErrorCode, message: string): SetTaskDatesResult {
  return { ok: false, error: domainError(code, message) }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOptionalTime(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function parseInput(input: unknown): SetTaskDatesInput | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const { taskId, startAt, dueAt, expectedUpdatedAt } = input as Record<string, unknown>
  if (typeof taskId !== 'string' || taskId.trim() === '') return undefined
  if (!isOptionalTime(startAt) || !isOptionalTime(dueAt) || !isFiniteNumber(expectedUpdatedAt)) return undefined
  return { taskId, startAt, dueAt, expectedUpdatedAt }
}

/** Validates, authorizes and saves new task dates; client input is untrusted, so every field is checked. */
export async function runSetTaskDates(deps: WorkDeps, input: unknown): Promise<SetTaskDatesResult> {
  const parsed = parseInput(input)
  if (parsed === undefined) return failure('VALIDATION', 'Task dates are invalid')
  const { startAt, dueAt, expectedUpdatedAt } = parsed
  if (startAt !== null && dueAt !== null && startAt > dueAt) {
    return failure('VALIDATION', 'The start date must not be after the due date')
  }
  const id = asId(parsed.taskId)
  const record = await deps.tasks.loadRecord({ type: TASK_TYPE, id })
  if (record === undefined) return failure('NOT_FOUND', 'This task no longer exists')
  if (!deps.can(deps.actor, 'update', { ...record, type: TASK_TYPE })) {
    return failure('FORBIDDEN', 'You do not have access to this task')
  }
  const saved = await deps.tasks.saveDates({ id, startAt, dueAt, expectedUpdatedAt })
  if (saved === undefined) return failure('CONFLICT', 'Updated by someone else, refreshed')
  return { ok: true, data: { startAt: saved.startAt, dueAt: saved.dueAt, updatedAt: saved.updatedAt } }
}

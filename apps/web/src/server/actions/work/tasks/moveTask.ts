'use server'

import { asId, type ErrorCode } from '@ops/kernel'
import { changeStage } from '@ops/platform'
import { revalidatePath } from 'next/cache'
import { getWorkDeps } from '../../../work/deps'
import type { WorkDeps } from '../../../work/task-repository'

interface MoveTaskInput {
  readonly taskId: string
  readonly toStageId: string
  readonly expectedUpdatedAt: number
}

type MoveTaskResult =
  | { readonly ok: true; readonly data: { readonly stageId: string; readonly updatedAt: number } }
  | { readonly ok: false; readonly error: { readonly code: ErrorCode; readonly message: string } }

const isFilled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

// Server action arguments come from the client, so the declared type is not trusted.
function parseInput(input: unknown): MoveTaskInput | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const { taskId, toStageId, expectedUpdatedAt } = input as Record<string, unknown>
  if (!isFilled(taskId) || !isFilled(toStageId)) return undefined
  if (typeof expectedUpdatedAt !== 'number' || !Number.isFinite(expectedUpdatedAt)) return undefined
  return { taskId, toStageId, expectedUpdatedAt }
}

/** Moves a task through platform `changeStage`; returns CONFLICT when `expectedUpdatedAt` is stale. */
export async function runMoveTask(deps: WorkDeps, input: unknown): Promise<MoveTaskResult> {
  const parsed = parseInput(input)
  if (parsed === undefined) {
    return { ok: false, error: { code: 'VALIDATION', message: 'taskId, toStageId and expectedUpdatedAt are required' } }
  }
  const { actor, can, tasks, uow, clock } = deps
  const result = await changeStage(
    { actor, can, store: tasks, uow, clock },
    {
      record: { type: 'task', id: asId(parsed.taskId) },
      toStageId: asId(parsed.toStageId),
      expectedUpdatedAt: parsed.expectedUpdatedAt,
    },
  )
  if (!result.ok) return { ok: false, error: { code: result.error.code, message: result.error.message } }
  return { ok: true, data: { stageId: result.value.stageId, updatedAt: result.value.updatedAt } }
}

/** Server action behind board drops and the "Move to…" menu. */
export async function moveTask(input: MoveTaskInput): Promise<MoveTaskResult> {
  const result = await runMoveTask(await getWorkDeps(), input)
  if (result.ok) {
    revalidatePath('/tasks/board')
    revalidatePath('/tasks')
  }
  return result
}

import type { Clock, Id } from '@ops/kernel'
import type { Actor, Can, StageStore, UnitOfWork, Workflow } from '@ops/platform'

/** Task priority (spec §10.2). */
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

/** A task as the board and timeline read it; times are epoch ms. */
export interface TaskRecord {
  readonly id: Id
  readonly title: string
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
  readonly updatedAt: number
  readonly priority: TaskPriority
  readonly assigneeIds: readonly Id[]
  readonly startAt: number | null
  readonly dueAt: number | null
}

/** Input of `saveDates`. */
export interface TaskDatesInput {
  readonly id: Id
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly expectedUpdatedAt: number
}

/** Task persistence; the stage methods come from platform `StageStore`. */
export interface TaskRepository extends StageStore {
  loadTaskWorkflow(): Promise<Workflow>
  listTasks(): Promise<readonly TaskRecord[]>
  /** Returns `undefined` when the task changed since `expectedUpdatedAt` or does not exist. */
  saveDates(input: TaskDatesInput): Promise<TaskRecord | undefined>
}

/** Per-request dependencies of work features. */
export interface WorkDeps {
  readonly actor: Actor
  readonly can: Can
  readonly tasks: TaskRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
}

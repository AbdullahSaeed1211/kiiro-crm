import type { Clock, Id } from '@ops/kernel'
import type { Actor, Can, StageStore, UnitOfWork, Workflow } from '@ops/platform'

/** Task priority levels (spec §10.2). */
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

/** A task as the board and timeline read it; timestamps are UTC epoch milliseconds (decision D-09). */
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

/** Input of {@link TaskRepository.saveDates}. */
export interface TaskDatesInput {
  readonly id: Id
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly expectedUpdatedAt: number
}

/** Task persistence for the board and timeline; the inherited stage methods serve platform `changeStage`. */
export interface TaskRepository extends StageStore {
  /** The workflow tasks follow; the spike has one task workflow per tenant. */
  loadTaskWorkflow(): Promise<Workflow>
  /** Every task of the tenant, in no particular order. */
  listTasks(): Promise<readonly TaskRecord[]>
  /** Writes both dates only while the task still has `expectedUpdatedAt`; `undefined` when it changed or does not exist. */
  saveDates(input: TaskDatesInput): Promise<TaskRecord | undefined>
}

/** Everything work features need per request. */
export interface WorkDeps {
  readonly actor: Actor
  readonly can: Can
  readonly tasks: TaskRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
}

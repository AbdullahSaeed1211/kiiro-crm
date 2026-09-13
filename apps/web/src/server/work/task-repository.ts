import type { Clock } from '@ops/kernel'
import type { TaskRepository } from '@ops/module-work'
import type { Actor, Can, UnitOfWork } from '@ops/platform'

export type { TaskDatesInput, TaskPriority, TaskRecord, TaskRepository } from '@ops/module-work'

/** Per-request dependencies of work features. */
export interface WorkDeps {
  readonly actor: Actor
  readonly can: Can
  readonly tasks: TaskRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
}

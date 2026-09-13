import type { Id } from '@ops/kernel'

/** Reference to any registered record, independent of its type. */
export interface RecordRef {
  readonly type: string
  readonly id: Id
}

/** Fields every stage-tracked record exposes to the platform. */
export interface StageTrackedRecord {
  readonly ref: RecordRef
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
  readonly updatedAt: number
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly groupId?: Id
}

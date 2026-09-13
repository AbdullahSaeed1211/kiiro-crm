import type { Id, Result } from '@ops/kernel'
import type { RecordRef, StageTrackedRecord } from './records'

/** Fixed categories that reports and automations rely on (decision D-28). */
export type StageCategory = 'backlog' | 'open' | 'active' | 'waiting' | 'done_success' | 'done_failure' | 'cancelled'

/** Palette names mapped to stage colour tokens in the UI. */
export type StageColor = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'

/** One step of a workflow. */
export interface Stage {
  readonly id: Id
  readonly name: string
  readonly category: StageCategory
  readonly color: StageColor
  readonly position: number
  readonly probability?: number
}

/** Ordered stages for one record type; transitions are unrestricted in Phase 1. */
export interface Workflow {
  readonly id: Id
  readonly recordType: string
  readonly name: string
  readonly stages: readonly Stage[]
  readonly defaultStageId: Id
}

/** Audit row written for every stage change. */
export interface StageTransition {
  readonly record: RecordRef
  readonly workflowId: Id
  readonly fromStageId: Id
  readonly toStageId: Id
  readonly fromCategory: StageCategory
  readonly toCategory: StageCategory
  readonly changedBy: Id
  readonly changedAt: number
  readonly durationMs: number
}

/** Input to the `changeStage` command. */
export interface ChangeStageInput {
  readonly record: RecordRef
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly reason?: string
}

/** Signature of the platform `changeStage` command (spec §9.4). */
export type ChangeStageCommand = (input: ChangeStageInput) => Promise<Result<StageTrackedRecord>>

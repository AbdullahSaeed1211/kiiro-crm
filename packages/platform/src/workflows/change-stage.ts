import { domainError, err, ok, type Clock, type DomainError, type Result } from '@ops/kernel'
import type { Actor, Can } from '../contracts/access'
import type { StageStore, UnitOfWork } from '../contracts/ports'
import type { StageTrackedRecord } from '../contracts/records'
import type { ChangeStageInput, Stage, StageTransition, Workflow } from '../contracts/workflows'

/** Collaborators of {@link changeStage}. */
export interface ChangeStageDeps {
  readonly actor: Actor
  readonly can: Can
  readonly store: StageStore
  readonly uow: UnitOfWork
  readonly clock: Clock
}

interface StageMove {
  readonly from: Stage
  readonly to: Stage
}

function checkAccess(
  deps: ChangeStageDeps,
  record: StageTrackedRecord,
  expectedUpdatedAt: number,
): DomainError | undefined {
  if (!deps.can(deps.actor, 'update', { ...record, type: record.ref.type })) {
    return domainError('FORBIDDEN', 'not allowed to update this record')
  }
  if (record.updatedAt !== expectedUpdatedAt) return domainError('CONFLICT', 'record was updated by someone else')
  return undefined
}

function findMove(workflow: Workflow, fromStageId: string, toStageId: string): Result<StageMove> {
  const from = workflow.stages.find((stage) => stage.id === fromStageId)
  const to = workflow.stages.find((stage) => stage.id === toStageId)
  if (from === undefined || to === undefined) {
    return err(domainError('VALIDATION', 'stage is not part of the record workflow', { toStageId }))
  }
  return ok({ from, to })
}

async function persistMove(deps: ChangeStageDeps, record: StageTrackedRecord, move: StageMove) {
  const now = deps.clock.now()
  const transition: StageTransition = {
    record: record.ref,
    workflowId: record.workflowId,
    fromStageId: move.from.id,
    toStageId: move.to.id,
    fromCategory: move.from.category,
    toCategory: move.to.category,
    changedBy: deps.actor.id,
    changedAt: now,
    durationMs: Math.max(0, now - record.stageEnteredAt),
  }
  return deps.uow.run(async (): Promise<Result<StageTrackedRecord>> => {
    const input = { ref: record.ref, stageId: move.to.id, stageEnteredAt: now, expectedUpdatedAt: record.updatedAt }
    const saved = await deps.store.saveStage(input)
    if (saved === undefined) return err(domainError('CONFLICT', 'record changed during the stage update'))
    await deps.store.addTransition(transition)
    const data = { fromStageId: move.from.id, toStageId: move.to.id, durationMs: transition.durationMs }
    await deps.store.addActivity({
      record: record.ref,
      verb: 'stage.changed',
      actorId: deps.actor.id,
      data,
      occurredAt: now,
    })
    return ok(saved)
  })
}

/**
 * Moves a stage-tracked record to another stage of its workflow (spec §9.4): the stage write is conditional on
 * `expectedUpdatedAt`, then the transition and the `stage.changed` activity are written in the same unit of work.
 * @returns the updated record, the unchanged record when the stage is the same, or NOT_FOUND, FORBIDDEN,
 * CONFLICT (stale or concurrent update) and VALIDATION (stage outside the workflow) errors
 */
export async function changeStage(deps: ChangeStageDeps, input: ChangeStageInput): Promise<Result<StageTrackedRecord>> {
  const record = await deps.store.loadRecord(input.record)
  if (record === undefined) return err(domainError('NOT_FOUND', 'record not found'))
  const denied = checkAccess(deps, record, input.expectedUpdatedAt)
  if (denied !== undefined) return err(denied)
  if (record.stageId === input.toStageId) return ok(record)
  const workflow = await deps.store.loadWorkflow(record.workflowId)
  if (workflow === undefined) return err(domainError('NOT_FOUND', 'workflow not found'))
  const move = findMove(workflow, record.stageId, input.toStageId)
  if (!move.ok) return err(move.error)
  return persistMove(deps, record, move.value)
}

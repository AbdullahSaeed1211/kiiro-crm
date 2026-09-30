import { err, ok, type Id } from '@ops/kernel'
import { changeStage, type Stage, type Workflow } from '@ops/platform'
import type { CrmDeps } from '../ports/repository'
import type { DealRecord, LeadRecord } from '../ports/records'
import { failure, type CrmResult } from './helpers'
import { unmetStageRequirements } from './stage-requirements'

function stageIn(workflow: Workflow, stageId: Id): Stage | undefined {
  return workflow.stages.find((stage) => stage.id === stageId)
}

interface PipelineMoveInput {
  readonly deps: CrmDeps
  readonly type: 'lead' | 'deal'
  readonly recordId: Id
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly reason?: string
  /** Returns why a stage is not a valid target for this record type, or null. */
  readonly destinationRule?: (destination: Stage) => string | null
}

interface ValidatedPipelineMove {
  readonly input: PipelineMoveInput
  readonly current: LeadRecord | DealRecord
  readonly destination: Stage
}

function lostReasonMissing(current: LeadRecord | DealRecord, destination: Stage): CrmResult<never> | undefined {
  return destination.category === 'done_failure' && current.lostReasonId === null
    ? failure('VALIDATION', 'a lost reason is required before moving to a lost stage')
    : undefined
}

/** The first rule that stops `current` moving to `destination`, if any. */
async function moveBlocker(
  input: PipelineMoveInput,
  current: LeadRecord | DealRecord,
  destination: Stage,
): Promise<CrmResult<never> | undefined> {
  const ruleError = input.destinationRule?.(destination) ?? null
  if (ruleError !== null) return failure('VALIDATION', ruleError)
  return (
    lostReasonMissing(current, destination) ??
    (await unmetStageRequirements(input.deps.repo, { type: input.type, record: current, stage: destination }))
  )
}

async function validatePipelineMove(input: PipelineMoveInput): Promise<CrmResult<ValidatedPipelineMove>> {
  const { deps, type, recordId, toStageId } = input
  const current = await deps.repo.get(type, recordId)
  if (current === undefined) return failure('NOT_FOUND', `${type} not found`)
  if (type === 'lead' && (current as LeadRecord).convertedAt !== null) {
    return failure('VALIDATION', 'a converted lead cannot change stage')
  }
  const workflow = await deps.repo.loadWorkflow(current.workflowId)
  if (workflow === undefined) return failure('NOT_FOUND', `${type} workflow not found`)
  const destination = stageIn(workflow, toStageId)
  if (destination === undefined) return failure('VALIDATION', 'stage is not part of the record workflow', { toStageId })
  return (await moveBlocker(input, current, destination)) ?? ok({ input, current, destination })
}

async function persistPipelineMove<T extends LeadRecord | DealRecord>(
  validated: ValidatedPipelineMove,
): Promise<CrmResult<T>> {
  const { input, current, destination } = validated
  const { deps, type, recordId, toStageId, expectedUpdatedAt, reason } = input
  const moved = await changeStage(
    { actor: deps.actor, can: deps.can, store: deps.repo, uow: deps.uow, clock: deps.clock },
    {
      record: { type, id: recordId },
      toStageId,
      expectedUpdatedAt,
      ...(reason === undefined ? {} : { reason }),
    },
  )
  if (!moved.ok) return err(moved.error)
  if (moved.value.stageId === current.stageId) return ok(current as T)
  const afterMove = await deps.repo.get(type, recordId)
  if (afterMove === undefined) return failure('NOT_FOUND', `${type} disappeared during stage change`)
  if (type !== 'deal') return ok(afterMove as T)
  return completeDealMove<T>({
    deps,
    recordId,
    before: current as DealRecord,
    after: afterMove as DealRecord,
    destination,
  })
}

/** Sets the deal's close time, then runs the won-deal hook the first time the deal closes as won. */
async function completeDealMove<T>(input: {
  readonly deps: CrmDeps
  readonly recordId: Id
  readonly before: DealRecord
  readonly after: DealRecord
  readonly destination: Stage
}): Promise<CrmResult<T>> {
  const { deps, recordId, before, after, destination } = input
  const finalized = await finalizeDealMove<T>({ deps, recordId, deal: after, category: destination.category })
  const firstWin = destination.category === 'done_success' && before.closedAt === null
  if (finalized.ok && firstWin) await deps.onDealWon?.(finalized.value as DealRecord)
  return finalized
}

async function finalizeDealMove<T>(input: {
  readonly deps: CrmDeps
  readonly recordId: Id
  readonly deal: DealRecord
  readonly category: Stage['category']
}): Promise<CrmResult<T>> {
  const { deps, recordId, deal, category } = input
  const closed = category === 'done_success' || category === 'done_failure' ? deps.clock.now() : null
  if (deal.closedAt === closed) return ok(deal as T)
  const saved = await deps.repo.update('deal', recordId, { closedAt: closed }, deal.updatedAt)
  if (saved === undefined) return failure('CONFLICT', 'deal changed during the stage update')
  return ok(saved as T)
}

/** Validates and persists a lead or deal stage move through the platform workflow service. */
/** Validates and applies a lead or deal stage change, running the lead/deal-specific rule, stage requirements and the deal-won hook. */
export async function movePipeline<T extends LeadRecord | DealRecord>(input: PipelineMoveInput): Promise<CrmResult<T>> {
  const validated = await validatePipelineMove(input)
  return validated.ok ? persistPipelineMove<T>(validated.value) : err(validated.error)
}

import { asId, domainError, err, ok, type DomainError, type Id, type Result } from '@ops/kernel'
import { changeStage, type Stage, type Workflow } from '@ops/platform'
import type { CrmDeps } from '../ports/repository'
import type { CrmDrafts, CrmRecordType, CrmRecords, DealRecord, LeadRecord, OrganizationRecord } from '../ports/records'

export type CrmResult<T> = Result<T>

export type CustomData = Readonly<Record<string, unknown>>

export interface CrmFieldDefinition {
  readonly key: string
  readonly type: string
  readonly recordType?: string
}

interface RecordWithCustomData {
  readonly customData?: CustomData
}

export function failure<T = never>(
  code: DomainError['code'],
  message: string,
  details?: Record<string, unknown>,
): CrmResult<T> {
  return err(domainError(code, message, details))
}

export function parse<T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  input: unknown,
): CrmResult<T> {
  const result = schema.safeParse(input)
  return result.success ? ok(result.data) : failure('VALIDATION', 'invalid CRM input')
}

export function id(value: string | null | undefined): Id | null {
  return value === null || value === undefined ? null : asId(value)
}

export function ids(values: readonly string[] | undefined): readonly Id[] {
  return (values ?? []).map(asId)
}

export function cleanNullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function accessDenied<T>(input: {
  readonly type: CrmRecordType
  readonly deps: CrmDeps
  readonly record: {
    readonly ownerId?: Id | null
    readonly assigneeIds?: readonly Id[]
    readonly groupId?: Id | null
  }
  readonly action?: 'create' | 'update' | 'convert'
}): CrmResult<T> | undefined {
  const { type, deps, record, action = 'update' } = input
  return deps.can(deps.actor, action, {
    type,
    ...(record.ownerId === null || record.ownerId === undefined ? {} : { ownerId: record.ownerId }),
    ...(record.assigneeIds === undefined ? {} : { assigneeIds: record.assigneeIds }),
    ...(record.groupId === null || record.groupId === undefined ? {} : { groupId: record.groupId }),
  })
    ? undefined
    : failure('FORBIDDEN', `not allowed to ${action} this ${type}`)
}

export function internalFailure<T>(error: unknown): CrmResult<T> {
  return failure('INTERNAL', 'CRM operation failed', error instanceof Error ? { cause: error.message } : undefined)
}

export async function withErrors<T>(work: () => Promise<CrmResult<T>>): Promise<CrmResult<T>> {
  try {
    return await work()
  } catch (error) {
    return internalFailure(error)
  }
}

export async function workflowFor(
  deps: CrmDeps,
  recordType: 'lead' | 'deal',
  workflowId: string | null | undefined,
): Promise<CrmResult<Workflow>> {
  const workflow =
    workflowId === undefined || workflowId === null
      ? await deps.repo.loadDefaultWorkflow(recordType)
      : await deps.repo.loadWorkflow(asId(workflowId))
  return workflow === undefined ? failure('NOT_FOUND', `${recordType} workflow not found`) : ok(workflow)
}

export function stageIn(workflow: Workflow, stageId: Id): Stage | undefined {
  return workflow.stages.find((stage) => stage.id === stageId)
}

export function recordCustomData(record: RecordWithCustomData): CustomData {
  return record.customData ?? {}
}

export function draftWithCustomData<T extends CrmRecordType>(
  draft: CrmDrafts[T],
  customData: CustomData | undefined,
): CrmDrafts[T] {
  if (customData === undefined) return draft
  return { ...draft, customData }
}

export async function executeCommand<T, I>(
  deps: CrmDeps,
  input: I,
  work: (deps: CrmDeps, input: I) => Promise<CrmResult<T>>,
): Promise<CrmResult<T>> {
  return withErrors(() => work(deps, input))
}

interface PipelineMoveInput {
  readonly deps: CrmDeps
  readonly type: 'lead' | 'deal'
  readonly recordId: Id
  readonly toStageId: Id
  readonly expectedUpdatedAt: number
  readonly reason?: string
}

interface ValidatedPipelineMove {
  readonly input: PipelineMoveInput
  readonly current: LeadRecord | DealRecord
  readonly destination: Stage
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
  if (destination.category === 'done_failure' && current.lostReasonId === null) {
    return failure('VALIDATION', 'a lost reason is required before moving to a lost stage')
  }
  return ok({ input, current, destination })
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
  return type === 'deal'
    ? finalizeDealMove<T>({ deps, recordId, deal: afterMove as DealRecord, category: destination.category })
    : ok(afterMove as T)
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
  return saved === undefined ? failure('CONFLICT', 'deal changed during the stage update') : ok(saved as T)
}

export async function movePipeline<T extends LeadRecord | DealRecord>(input: PipelineMoveInput): Promise<CrmResult<T>> {
  const validated = await validatePipelineMove(input)
  return validated.ok ? persistPipelineMove<T>(validated.value) : err(validated.error)
}

export async function createActivity(input: {
  readonly deps: CrmDeps
  readonly record: { readonly type: CrmRecordType; readonly id: Id }
  readonly verb: string
  readonly data?: Readonly<Record<string, unknown>>
}): Promise<void> {
  const { deps, record, verb, data = {} } = input
  await deps.repo.addActivity({ record, verb, actorId: deps.actor.id, data, occurredAt: deps.clock.now() })
}

export async function findExistingDeal(deps: CrmDeps, sourceLeadId: Id): Promise<DealRecord | undefined> {
  const candidateRepo = deps.repo as CrmDeps['repo'] & {
    findDealBySourceLead?: (leadId: Id) => Promise<DealRecord | undefined>
  }
  if (candidateRepo.findDealBySourceLead !== undefined) return candidateRepo.findDealBySourceLead(sourceLeadId)
  const deals = await deps.repo.list('deal')
  return deals.find((deal) => deal.sourceLeadId === sourceLeadId)
}

export async function findExistingOrganization(deps: CrmDeps, name: string): Promise<OrganizationRecord | undefined> {
  const organizations = await deps.repo.list('organization')
  return organizations.find((organization) => organization.name.trim().toLowerCase() === name.trim().toLowerCase())
}

export async function dealCustomData(
  deps: CrmDeps,
  lead: LeadRecord & RecordWithCustomData,
  requested: CustomData | undefined,
): Promise<CustomData> {
  const leadData = requested ?? recordCustomData(lead)
  const candidateRepo = deps.repo as CrmDeps['repo'] & {
    listFieldDefinitions?: (recordType: CrmRecordType) => Promise<readonly CrmFieldDefinition[]>
    getFieldDefinitions?: (recordType: CrmRecordType) => Promise<readonly CrmFieldDefinition[]>
    fieldDefinitions?: readonly CrmFieldDefinition[]
  }
  let leadFields: readonly CrmFieldDefinition[] = []
  let dealFields: readonly CrmFieldDefinition[] = []
  if (candidateRepo.listFieldDefinitions !== undefined) {
    ;[leadFields, dealFields] = await Promise.all([
      candidateRepo.listFieldDefinitions('lead'),
      candidateRepo.listFieldDefinitions('deal'),
    ])
  } else if (candidateRepo.getFieldDefinitions !== undefined) {
    ;[leadFields, dealFields] = await Promise.all([
      candidateRepo.getFieldDefinitions('lead'),
      candidateRepo.getFieldDefinitions('deal'),
    ])
  } else if (candidateRepo.fieldDefinitions !== undefined) {
    leadFields = candidateRepo.fieldDefinitions.filter(
      (field) => field.recordType === undefined || field.recordType === 'lead',
    )
    dealFields = candidateRepo.fieldDefinitions.filter(
      (field) => field.recordType === undefined || field.recordType === 'deal',
    )
  }
  const leadTypes = new Map(leadFields.map((field) => [field.key, field.type]))
  const dealTypes = new Map(dealFields.map((field) => [field.key, field.type]))
  return Object.fromEntries(
    Object.entries(leadData).filter(
      ([key]) => leadTypes.get(key) !== undefined && leadTypes.get(key) === dealTypes.get(key),
    ),
  )
}

export type AnyCrmRecord = CrmRecords[CrmRecordType]

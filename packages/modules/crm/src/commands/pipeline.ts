import { asId, ok, type Id } from '@ops/kernel'
import type { Workflow } from '@ops/platform'
import type { CrmDeps } from '../ports/repository'
import type { CrmDrafts, DealRecord, LeadRecord } from '../ports/records'
import {
  createDealSchema,
  createLeadSchema,
  moveDealSchema,
  moveLeadSchema,
  updateDealSchema,
  updateLeadSchema,
} from '../schema'
import type { UpdateDealInput, UpdateLeadInput } from '../schema'
import { createWithActivity } from './crud'
import {
  accessDenied,
  cleanNullable,
  executeCommand,
  failure,
  id,
  ids,
  movePipeline,
  parse,
  type CrmResult,
} from '../domain/helpers'

interface StageDefaults {
  readonly workflow: Workflow
  readonly stage: Workflow['stages'][number]
  readonly stageId: Id
}

async function stageDefaults(input: {
  readonly deps: CrmDeps
  readonly recordType: 'lead' | 'deal'
  readonly workflowId: string | null | undefined
  readonly stageId: string | null | undefined
}): Promise<CrmResult<StageDefaults>> {
  const { deps, recordType, workflowId, stageId } = input
  const workflow =
    workflowId === undefined || workflowId === null
      ? await deps.repo.loadDefaultWorkflow(recordType)
      : await deps.repo.loadWorkflow(asId(workflowId))
  if (workflow === undefined) return failure('NOT_FOUND', `${recordType} workflow not found`)
  const selected = asId(stageId ?? workflow.defaultStageId)
  const stage = workflow.stages.find((candidate) => candidate.id === selected)
  if (stage === undefined) return failure('VALIDATION', `stage is not part of the ${recordType} workflow`)
  if (stage.category === 'done_failure')
    return failure('VALIDATION', 'a lost reason is required before entering a lost stage')
  return ok({ workflow, stage, stageId: selected })
}

function pipelineFields(
  deps: CrmDeps,
  input: { readonly ownerId?: string | null | undefined; readonly assigneeIds?: readonly string[] | undefined },
  defaults: StageDefaults,
) {
  return {
    ownerId: id(input.ownerId),
    assigneeIds: ids(input.assigneeIds),
    workflowId: defaults.workflow.id,
    stageId: defaults.stageId,
    stageEnteredAt: deps.clock.now(),
    lostReasonId: null,
    lostNote: null,
  }
}

function normalizeLeadEntry(key: string, value: unknown): unknown {
  if (value === undefined) return value
  if (key === 'assigneeIds') return ids(value as string[])
  if (['firstName', 'lastName', 'email', 'phone', 'companyName'].includes(key))
    return cleanNullable(value as string | null)
  if (['organizationId', 'sourceId', 'ownerId'].includes(key)) return id(value as string | null)
  return value
}

function leadPatch(value: UpdateLeadInput['patch']): Partial<CrmDrafts['lead']> {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeLeadEntry(key, entry)]))
}

function dealPatch(value: UpdateDealInput['patch']): Partial<CrmDrafts['deal']> {
  return {
    ...value,
    ...(value.organizationId === undefined ? {} : { organizationId: id(value.organizationId) }),
    ...(value.contactIds === undefined ? {} : { contactIds: ids(value.contactIds) }),
    ...(value.primaryContactId === undefined ? {} : { primaryContactId: id(value.primaryContactId) }),
    ...(value.ownerId === undefined ? {} : { ownerId: id(value.ownerId) }),
    ...(value.assigneeIds === undefined ? {} : { assigneeIds: ids(value.assigneeIds) }),
    ...(value.sourceLeadId === undefined ? {} : { sourceLeadId: id(value.sourceLeadId) }),
  } as unknown as Partial<CrmDrafts['deal']>
}

function leadTitle(value: {
  readonly title?: string | undefined
  readonly firstName?: string | null | undefined
  readonly lastName?: string | null | undefined
  readonly companyName?: string | null | undefined
}): CrmResult<string> {
  const title =
    (value.title ?? [value.firstName, value.lastName].filter(Boolean).join(' ')) || cleanNullable(value.companyName)
  return title === null || title.trim() === ''
    ? failure('VALIDATION', 'lead title or a name/company is required')
    : ok(title.trim())
}

async function createLeadWork(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  const parsed = parse(createLeadSchema, input)
  if (!parsed.ok) return parsed
  const denied = accessDenied<LeadRecord>({ type: 'lead', deps, record: {}, action: 'create' })
  if (denied !== undefined) return denied
  const value = parsed.value
  const title = leadTitle(value)
  if (!title.ok) return title
  const defaults = await stageDefaults({
    deps,
    recordType: 'lead',
    workflowId: value.workflowId,
    stageId: value.stageId,
  })
  if (!defaults.ok) return defaults
  const draft = {
    title: title.value,
    firstName: cleanNullable(value.firstName),
    lastName: cleanNullable(value.lastName),
    email: cleanNullable(value.email),
    phone: cleanNullable(value.phone),
    companyName: cleanNullable(value.companyName),
    organizationId: id(value.organizationId),
    sourceId: id(value.sourceId),
    ...pipelineFields(deps, value, defaults.value),
    convertedAt: null,
    convertedDealId: null,
  } as CrmDrafts['lead']
  return createWithActivity(deps, 'lead', draft)
}

export function createLead(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  return executeCommand(deps, input, createLeadWork)
}

async function updateLeadWork(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  const parsed = parse(updateLeadSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const current = await deps.repo.get('lead', asId(value.id))
  if (current === undefined) return failure('NOT_FOUND', 'lead not found')
  const denied = accessDenied<LeadRecord>({ type: 'lead', deps, record: current })
  if (denied !== undefined) return denied
  const patch = leadPatch(value.patch)
  const saved = await deps.repo.update('lead', current.id, patch, value.expectedUpdatedAt)
  return saved === undefined ? failure('CONFLICT', 'lead was updated by someone else') : ok(saved)
}

export function updateLead(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  return executeCommand(deps, input, updateLeadWork)
}

async function createDealWork(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  const parsed = parse(createDealSchema, input)
  if (!parsed.ok) return parsed
  const denied = accessDenied<DealRecord>({ type: 'deal', deps, record: {}, action: 'create' })
  if (denied !== undefined) return denied
  const value = parsed.value
  const defaults = await stageDefaults({
    deps,
    recordType: 'deal',
    workflowId: value.workflowId,
    stageId: value.stageId,
  })
  if (!defaults.ok) return defaults
  const draft = {
    title: value.title,
    organizationId: id(value.organizationId),
    contactIds: ids(value.contactIds),
    primaryContactId: id(value.primaryContactId),
    value: value.value ?? null,
    expectedCloseAt: value.expectedCloseAt ?? null,
    closedAt: defaults.value.stage.category === 'done_success' ? deps.clock.now() : null,
    sourceLeadId: id(value.sourceLeadId),
    ...pipelineFields(deps, value, defaults.value),
  } as CrmDrafts['deal']
  return createWithActivity(deps, 'deal', draft)
}

export function createDeal(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  return executeCommand(deps, input, createDealWork)
}

async function updateDealWork(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  const parsed = parse(updateDealSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const current = await deps.repo.get('deal', asId(value.id))
  if (current === undefined) return failure('NOT_FOUND', 'deal not found')
  const denied = accessDenied<DealRecord>({ type: 'deal', deps, record: current })
  if (denied !== undefined) return denied
  const patch = dealPatch(value.patch)
  const saved = await deps.repo.update('deal', current.id, patch, value.expectedUpdatedAt)
  return saved === undefined ? failure('CONFLICT', 'deal was updated by someone else') : ok(saved)
}

export function updateDeal(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  return executeCommand(deps, input, updateDealWork)
}

async function moveLeadWork(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  const parsed = parse(moveLeadSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  return movePipeline({
    deps,
    type: 'lead',
    recordId: asId(value.leadId),
    toStageId: asId(value.toStageId),
    expectedUpdatedAt: value.expectedUpdatedAt,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
  })
}

export function moveLead(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  return executeCommand(deps, input, moveLeadWork)
}

async function moveDealWork(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  const parsed = parse(moveDealSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  return movePipeline({
    deps,
    type: 'deal',
    recordId: asId(value.dealId),
    toStageId: asId(value.toStageId),
    expectedUpdatedAt: value.expectedUpdatedAt,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
  })
}

export function moveDeal(deps: CrmDeps, input: unknown): Promise<CrmResult<DealRecord>> {
  return executeCommand(deps, input, moveDealWork)
}

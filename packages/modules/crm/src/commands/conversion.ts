import { asId, ok, type Id } from '@ops/kernel'
import type { Workflow } from '@ops/platform'
import type { CrmDeps } from '../ports/repository'
import type { ContactRecord, CrmDrafts, DealRecord, LeadRecord } from '../ports/records'
import { convertLeadSchema, markLostSchema, type ConvertLeadInput } from '../schema'
import {
  accessDenied,
  cleanNullable,
  dealCustomData,
  draftWithCustomData,
  executeCommand,
  failure,
  findExistingDeal,
  findExistingOrganization,
  movePipeline,
  parse,
  type CrmResult,
} from '../domain/helpers'
import { finishConversion } from './finish'

interface PipelineRecord {
  readonly type: 'lead' | 'deal'
  readonly record: LeadRecord | DealRecord
}

async function findPipelineRecord(deps: CrmDeps, id: Id): Promise<CrmResult<PipelineRecord>> {
  const lead = await deps.repo.get('lead', id)
  if (lead !== undefined) return ok({ type: 'lead', record: lead })
  const deal = await deps.repo.get('deal', id)
  return deal === undefined ? failure('NOT_FOUND', 'lead or deal not found') : ok({ type: 'deal', record: deal })
}

async function lostStage(deps: CrmDeps, record: PipelineRecord): Promise<CrmResult<Workflow['stages'][number]>> {
  const workflow = await deps.repo.loadWorkflow(record.record.workflowId)
  if (workflow === undefined) return failure('NOT_FOUND', `${record.type} workflow not found`)
  const stage = workflow.stages.find((candidate) => candidate.category === 'done_failure')
  return stage === undefined ? failure('VALIDATION', 'workflow has no lost stage') : ok(stage)
}

async function validateLostRequest(
  deps: CrmDeps,
  found: PipelineRecord,
  lostReasonId: Id,
): Promise<CrmResult<Workflow['stages'][number]>> {
  if (found.type === 'lead' && (found.record as LeadRecord).convertedAt !== null)
    return failure('VALIDATION', 'a converted lead cannot be marked lost')
  const denied = accessDenied<Workflow['stages'][number]>({ type: found.type, deps, record: found.record })
  if (denied !== undefined) return denied
  const reasons = await deps.repo.listLookups('lostReason')
  if (!reasons.some((reason) => reason.id === lostReasonId)) return failure('NOT_FOUND', 'lost reason not found')
  return lostStage(deps, found)
}

async function markLostWork(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord | DealRecord>> {
  const parsed = parse(markLostSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const found = await findPipelineRecord(deps, asId(value.id))
  if (!found.ok) return found
  if (found.value.record.updatedAt !== value.expectedUpdatedAt)
    return failure('CONFLICT', `${found.value.type} was updated by someone else`)
  const destination = await validateLostRequest(deps, found.value, asId(value.lostReasonId))
  if (!destination.ok) return destination
  const saved = await deps.repo.update(
    found.value.type,
    found.value.record.id,
    {
      lostReasonId: asId(value.lostReasonId),
      lostNote: value.lostNote === undefined ? null : cleanNullable(value.lostNote),
    },
    found.value.record.updatedAt,
  )
  if (saved === undefined) return failure('CONFLICT', `${found.value.type} was updated by someone else`)
  const moved = await movePipeline({
    deps,
    type: found.value.type,
    recordId: saved.id,
    toStageId: destination.value.id,
    expectedUpdatedAt: saved.updatedAt,
  })
  if (!moved.ok) return moved
  return moved
}

export function markLost(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord | DealRecord>> {
  return executeCommand(deps, input, markLostWork)
}

async function resolveOrganization(
  deps: CrmDeps,
  lead: LeadRecord,
  input: ConvertLeadInput['organization'],
): Promise<CrmResult<Id | null>> {
  if (input === null) return ok(null)
  if ('existingId' in input) {
    const organization = await deps.repo.get('organization', asId(input.existingId))
    return organization === undefined ? failure('NOT_FOUND', 'organization not found') : ok(organization.id)
  }
  const existing = await findExistingOrganization(deps, input.create.name)
  if (existing !== undefined) return ok(existing.id)
  const created = await deps.repo.create('organization', {
    name: input.create.name,
    website: null,
    phone: null,
    email: null,
    ownerId: lead.ownerId,
    sourceId: lead.sourceId,
  } as unknown as CrmDrafts['organization'])
  return ok(created.id)
}

async function resolveContact(input: {
  readonly deps: CrmDeps
  readonly lead: LeadRecord
  readonly selection: ConvertLeadInput['contact']
  readonly organizationId: Id | null
}): Promise<CrmResult<ContactRecord>> {
  const { deps, lead, selection, organizationId } = input
  if ('existingId' in selection) {
    const contact = await deps.repo.get('contact', asId(selection.existingId))
    return contact === undefined ? failure('NOT_FOUND', 'contact not found') : ok(contact)
  }
  const email = cleanNullable(lead.email)
  const existing = email === null ? undefined : await deps.repo.findContactByEmail(email)
  if (existing !== undefined) return ok(existing)
  const contact = await deps.repo.create('contact', {
    firstName: cleanNullable(lead.firstName) ?? lead.title,
    lastName: cleanNullable(lead.lastName),
    email,
    phone: cleanNullable(lead.phone),
    organizationId,
    ownerId: lead.ownerId,
  })
  return ok(contact)
}

async function createConvertedDeal(input: {
  readonly deps: CrmDeps
  readonly lead: LeadRecord
  readonly contact: ContactRecord
  readonly organizationId: Id | null
  readonly selection: ConvertLeadInput['deal']
  readonly workflow: Workflow
}): Promise<DealRecord> {
  const { deps, lead, contact, organizationId, selection, workflow } = input
  const customData = await dealCustomData(deps, lead, selection.customData)
  const draft = {
    title: selection.title ?? lead.title,
    organizationId,
    contactIds: [contact.id],
    primaryContactId: contact.id,
    value: selection.value ?? null,
    expectedCloseAt: null,
    closedAt: null,
    sourceLeadId: lead.id,
    ownerId: lead.ownerId,
    assigneeIds: lead.assigneeIds,
    workflowId: workflow.id,
    stageId: workflow.defaultStageId,
    stageEnteredAt: deps.clock.now(),
    lostReasonId: null,
    lostNote: null,
  } as CrmDrafts['deal']
  return deps.repo.create('deal', draftWithCustomData(draft, customData) as CrmDrafts['deal'])
}

async function resolveDeal(input: {
  readonly deps: CrmDeps
  readonly lead: LeadRecord
  readonly contact: ContactRecord
  readonly organizationId: Id | null
  readonly selection: ConvertLeadInput['deal']
}): Promise<CrmResult<DealRecord>> {
  const { deps, lead, contact, organizationId, selection } = input
  const existing = await findExistingDeal(deps, lead.id)
  if (existing !== undefined) return ok(existing)
  const workflow =
    selection.workflowId === undefined
      ? await deps.repo.loadDefaultWorkflow('deal')
      : await deps.repo.loadWorkflow(asId(selection.workflowId))
  if (workflow === undefined) return failure('NOT_FOUND', 'deal workflow not found')
  return ok(await createConvertedDeal({ deps, lead, contact, organizationId, selection, workflow }))
}

interface ConversionStart {
  readonly lead: LeadRecord
  readonly convertedStage: Workflow['stages'][number]
}

async function conversionStart(deps: CrmDeps, value: ConvertLeadInput): Promise<CrmResult<ConversionStart>> {
  const lead = await deps.repo.get('lead', asId(value.leadId))
  if (lead === undefined) return failure('NOT_FOUND', 'lead not found')
  const denied = accessDenied<ConversionStart>({ type: 'lead', deps, record: lead, action: 'convert' })
  if (denied !== undefined) return denied
  if (lead.convertedAt !== null) return failure('ALREADY_DONE', 'lead has already been converted')
  if (lead.updatedAt !== value.expectedUpdatedAt) return failure('CONFLICT', 'lead was updated by someone else')
  const workflow = await deps.repo.loadWorkflow(lead.workflowId)
  if (workflow === undefined) return failure('NOT_FOUND', 'lead workflow not found')
  const convertedStage = workflow.stages.find((stage) => stage.category === 'done_success')
  return convertedStage === undefined
    ? failure('VALIDATION', 'lead workflow has no converted stage')
    : ok({ lead, convertedStage })
}

async function convertLeadWork(deps: CrmDeps, value: ConvertLeadInput): Promise<CrmResult<LeadRecord>> {
  const start = await conversionStart(deps, value)
  if (!start.ok) return start
  const organization = await resolveOrganization(deps, start.value.lead, value.organization)
  if (!organization.ok) return organization
  const contact = await resolveContact({
    deps,
    lead: start.value.lead,
    selection: value.contact,
    organizationId: organization.value,
  })
  if (!contact.ok) return contact
  const deal = await resolveDeal({
    deps,
    lead: start.value.lead,
    contact: contact.value,
    organizationId: organization.value,
    selection: value.deal,
  })
  if (!deal.ok) return deal
  return finishConversion({
    deps,
    lead: start.value.lead,
    convertedStage: start.value.convertedStage,
    deal: deal.value,
  })
}

async function convertInputWork(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  const parsed = parse(convertLeadSchema, input)
  if (!parsed.ok) return parsed
  const idempotent = deps.uow as CrmDeps['uow'] & {
    runIdempotent?: <T>(key: string, work: () => Promise<T>) => Promise<T>
  }
  const work = () => convertLeadWork(deps, parsed.value)
  return idempotent.runIdempotent === undefined
    ? deps.uow.run(work)
    : idempotent.runIdempotent(`convert:${parsed.value.leadId}`, work)
}

export function convertLead(deps: CrmDeps, input: unknown): Promise<CrmResult<LeadRecord>> {
  return executeCommand(deps, input, convertInputWork)
}

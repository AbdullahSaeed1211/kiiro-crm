import {
  asId,
  domainError,
  err,
  invalidInput,
  ok,
  type DomainError,
  type Id,
  type InputIssue,
  type Result,
} from '@ops/kernel'
import type { CrmDeps } from '../ports/repository'
import type { CrmCustomData, CrmRecordType, DealRecord, LeadRecord, OrganizationRecord } from '../ports/records'

export type CrmResult<T> = Result<T>

type CustomData = CrmCustomData

interface CrmFieldDefinition {
  readonly key: string
  readonly type: string
  readonly recordType?: string
}

interface RecordWithCustomData {
  readonly customData: CustomData
}

/** Creates a failed CRM result with a stable domain error. */
export function failure<T = never>(
  code: DomainError['code'],
  message: string,
  details?: Record<string, unknown>,
): CrmResult<T> {
  return err(domainError(code, message, details))
}

/** Parses unknown command input into a CRM result. */
export function parse<T>(
  schema: {
    safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: readonly InputIssue[] } }
  },
  input: unknown,
): CrmResult<T> {
  const result = schema.safeParse(input)
  return result.success ? ok(result.data) : err(invalidInput('invalid CRM input', result.error.issues))
}

/** Converts an optional external id into the branded kernel id. */
export function id(value: string | null | undefined): Id | null {
  return value === null || value === undefined ? null : asId(value)
}

/** Converts optional external ids into branded kernel ids. */
export function ids(values: readonly string[] | undefined): readonly Id[] {
  return (values ?? []).map(asId)
}

/** Trims optional text and normalizes an empty value to null. */
export function cleanNullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Returns a forbidden result when the actor cannot perform the CRM action. */
export function accessDenied<T>(input: {
  readonly type: CrmRecordType
  readonly deps: CrmDeps
  readonly record: {
    readonly ownerId?: Id | null
    readonly assigneeIds?: readonly Id[]
    readonly groupId?: Id | null
  }
  readonly action?: 'create' | 'update' | 'convert' | 'delete'
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

function internalFailure<T>(error: unknown): CrmResult<T> {
  return failure('INTERNAL', 'CRM operation failed', error instanceof Error ? { cause: error.message } : undefined)
}

async function withErrors<T>(work: () => Promise<CrmResult<T>>): Promise<CrmResult<T>> {
  try {
    return await work()
  } catch (error) {
    return internalFailure(error)
  }
}

function recordCustomData(record: RecordWithCustomData): CustomData {
  return record.customData
}

/** Runs a validated command and converts unexpected exceptions into domain failures. */
export async function executeCommand<T, I>(
  deps: CrmDeps,
  input: I,
  work: (deps: CrmDeps, input: I) => Promise<CrmResult<T>>,
): Promise<CrmResult<T>> {
  return withErrors(() => work(deps, input))
}

/** Writes one CRM activity entry for the current actor. */
export async function createActivity(input: {
  readonly deps: CrmDeps
  readonly record: { readonly type: CrmRecordType; readonly id: Id }
  readonly verb: string
  readonly data?: Readonly<Record<string, unknown>>
}): Promise<void> {
  const { deps, record, verb, data = {} } = input
  await deps.repo.addActivity({ record, verb, actorId: deps.actor.id, data, occurredAt: deps.clock.now() })
}

/** Finds the deal already created from a lead during conversion recovery. */
export async function findExistingDeal(deps: CrmDeps, sourceLeadId: Id): Promise<DealRecord | undefined> {
  const candidateRepo = deps.repo as CrmDeps['repo'] & {
    findDealBySourceLead?: (leadId: Id) => Promise<DealRecord | undefined>
  }
  if (candidateRepo.findDealBySourceLead !== undefined) return candidateRepo.findDealBySourceLead(sourceLeadId)
  const deals = await deps.repo.list('deal')
  return deals.find((deal) => deal.sourceLeadId === sourceLeadId)
}

/** Finds an organization by its normalized name during lead conversion. */
export async function findExistingOrganization(deps: CrmDeps, name: string): Promise<OrganizationRecord | undefined> {
  const organizations = await deps.repo.list('organization')
  return organizations.find((organization) => organization.name.trim().toLowerCase() === name.trim().toLowerCase())
}

/** Selects lead custom values whose field key and type also exist on deals. */
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

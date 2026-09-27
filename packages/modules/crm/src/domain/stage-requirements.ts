import { domainError, err, type Result } from '@ops/kernel'
import type { Stage } from '@ops/platform'
import type { CrmRepository } from '../ports/repository'
import type { DealRecord, LeadRecord } from '../ports/records'

/** Built-in fields a lead or deal stage may require, with the names people see. */
export const STANDARD_STAGE_FIELDS: Readonly<Record<'lead' | 'deal', Readonly<Record<string, string>>>> = {
  lead: {
    email: 'Email',
    phone: 'Phone',
    companyName: 'Company',
    organizationId: 'Organization',
    ownerId: 'Owner',
  },
  deal: {
    organizationId: 'Organization',
    primaryContactId: 'Primary contact',
    ownerId: 'Owner',
    value: 'Value',
    expectedCloseAt: 'Expected close date',
  },
}

const isEmpty = (value: unknown): boolean =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

function valueOf(type: 'lead' | 'deal', record: LeadRecord | DealRecord, key: string): unknown {
  return Object.hasOwn(STANDARD_STAGE_FIELDS[type], key) ? Reflect.get(record, key) : record.customData[key]
}

/** The required fields of `stage` that `record` leaves empty, as field key and label. */
async function missingStageFields(
  repo: CrmRepository,
  input: Readonly<{ type: 'lead' | 'deal'; record: LeadRecord | DealRecord; stage: Stage }>,
): Promise<readonly Readonly<{ key: string; label: string }>[]> {
  const required = input.stage.requiredFields ?? []
  const missing = required.filter((key) => isEmpty(valueOf(input.type, input.record, key)))
  if (missing.length === 0) return []
  const labels = new Map((await repo.loadFieldDefinitions(input.type)).map((field) => [field.key, field.label]))
  return missing.map((key) => ({ key, label: STANDARD_STAGE_FIELDS[input.type][key] ?? labels.get(key) ?? key }))
}

/** A validation failure naming each empty required field of the destination stage; `undefined` when all are set. */
export async function unmetStageRequirements(
  repo: CrmRepository,
  input: Readonly<{ type: 'lead' | 'deal'; record: LeadRecord | DealRecord; stage: Stage }>,
): Promise<Result<never> | undefined> {
  const missing = await missingStageFields(repo, input)
  if (missing.length === 0) return undefined
  const { name } = input.stage
  const fields = Object.fromEntries(missing.map(({ key, label }) => [key, `${label} is required for ${name}.`]))
  const names = missing.map(({ label }) => label).join(', ')
  return err(domainError('VALIDATION', `Fill in ${names} before moving to ${name}.`, { fields }))
}

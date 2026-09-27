import { asId, ok } from '@ops/kernel'
import { validateCustomValues, visibleFields } from '@ops/platform'
import { accessDenied, failure, parse, type CrmResult } from '../domain/helpers'
import type { CrmDeps } from '../ports/repository'
import type { CrmRecords, CrmRecordType } from '../ports/records'
import { setCustomFieldsSchema } from '../schema'

/**
 * Saves tenant-defined field values on a CRM record. Only fields the actor may see can be written; values of
 * other fields, including hidden and manager-only ones, are kept as stored.
 */
export async function setCustomFields(deps: CrmDeps, input: unknown): Promise<CrmResult<CrmRecords[CrmRecordType]>> {
  const parsed = parse(setCustomFieldsSchema, input)
  if (!parsed.ok) return parsed
  const { type, id, expectedUpdatedAt, values } = parsed.value
  const current = await deps.repo.get(type, asId(id))
  if (current === undefined) return failure('NOT_FOUND', `${type} not found`)
  const denied = accessDenied<CrmRecords[CrmRecordType]>({ type, deps, record: current })
  if (denied !== undefined) return denied
  const fields = visibleFields(await deps.repo.loadFieldDefinitions(type), deps.actor)
  const checked = validateCustomValues(fields, values)
  if (!checked.ok) return checked
  const customData = { ...current.customData, ...checked.value }
  const saved = await deps.repo.update(type, current.id, { customData }, expectedUpdatedAt)
  return saved === undefined ? failure('CONFLICT', `${type} was updated by someone else`) : ok(saved)
}

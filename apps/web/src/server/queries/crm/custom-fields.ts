import { asId } from '@ops/kernel'
import type { CrmRecordType } from '@ops/module-crm'
import { visibleFields, type CustomValue } from '@ops/platform'
import type { CustomFieldView } from '@ops/ui/composites/CustomFields'
import { crmDeps, getRequestContext } from '@/server/container'

/** What the custom fields card needs for one CRM record; `undefined` when the record is out of scope. */
export interface CustomFieldsView {
  readonly fields: readonly CustomFieldView[]
  readonly values: Readonly<Record<string, CustomValue>>
  readonly updatedAt: number
  readonly canEdit: boolean
}

const SCALAR_TYPES: ReadonlySet<string> = new Set(['string', 'number', 'boolean'])

/** A stored value as the card shows it; anything that is not a scalar or a string list reads as empty. */
function asValue(value: unknown): CustomValue {
  const list = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
  const scalar = SCALAR_TYPES.has(typeof value) ? (value as CustomValue) : null
  return list ?? scalar
}

/** Loads the fields the actor may see on a record, their stored values, and whether the actor may edit them. */
export async function loadCustomFieldsView(type: CrmRecordType, id: string): Promise<CustomFieldsView | undefined> {
  const deps = await crmDeps(await getRequestContext())
  const [record, definitions] = await Promise.all([deps.repo.get(type, asId(id)), deps.repo.loadFieldDefinitions(type)])
  if (record === undefined) return undefined
  const fields = visibleFields(definitions, deps.actor)
  const values = Object.fromEntries(fields.map((field) => [field.key, asValue(record.customData[field.key])]))
  const resource = {
    type,
    ...(record.ownerId === null ? {} : { ownerId: record.ownerId }),
    ...('assigneeIds' in record ? { assigneeIds: record.assigneeIds } : {}),
  }
  return {
    fields: fields.map(({ key, label, type: fieldType, required, options }) => ({
      key,
      label,
      type: fieldType,
      required,
      options,
    })),
    values,
    updatedAt: record.updatedAt,
    canEdit: deps.can(deps.actor, 'update', resource),
  }
}

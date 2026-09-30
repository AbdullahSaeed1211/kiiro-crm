import { asId } from '@ops/kernel'
import type { CrmRecordType } from '@ops/module-crm'
import type { CustomFieldView } from '@ops/ui/composites/CustomFields'
import { crmDeps, getRequestContext } from '@/server/container'

/** Built-in record fields that can be edited in place. */
export interface RecordDetailsView {
  readonly fields: readonly CustomFieldView[]
  readonly values: Readonly<Record<string, string | null>>
  readonly updatedAt: number
  readonly canEdit: boolean
}

const FIELD_CONFIGS: Readonly<
  Record<CrmRecordType, readonly Readonly<{ key: string; label: string; type: string; required: boolean }>[]>
> = {
  organization: [
    { key: 'website', label: 'Website', type: 'url', required: false },
    { key: 'email', label: 'Email', type: 'email', required: false },
    { key: 'phone', label: 'Phone', type: 'text', required: false },
  ],
  contact: [
    { key: 'firstName', label: 'First name', type: 'text', required: true },
    { key: 'lastName', label: 'Last name', type: 'text', required: false },
    { key: 'email', label: 'Email', type: 'email', required: false },
    { key: 'phone', label: 'Phone', type: 'text', required: false },
  ],
  lead: [
    { key: 'firstName', label: 'First name', type: 'text', required: false },
    { key: 'lastName', label: 'Last name', type: 'text', required: false },
    { key: 'email', label: 'Email', type: 'email', required: false },
    { key: 'phone', label: 'Phone', type: 'text', required: false },
    { key: 'companyName', label: 'Company', type: 'text', required: false },
  ],
  deal: [],
}

/** Loads the built-in record fields for a CRM record that can be edited. */
export async function loadRecordDetailsView(type: CrmRecordType, id: string): Promise<RecordDetailsView | undefined> {
  const deps = await crmDeps(await getRequestContext())
  const record = await deps.repo.get(type, asId(id))
  if (record === undefined) return undefined

  const fieldConfigs = FIELD_CONFIGS[type]
  const fields: CustomFieldView[] = fieldConfigs.map(({ key, label, type: fieldType, required }) => ({
    key,
    label,
    type: fieldType as CustomFieldView['type'],
    required,
    options: [],
  }))

  const values: Record<string, string | null> = {}
  for (const config of fieldConfigs) {
    const value = record[config.key as keyof typeof record]
    values[config.key] = typeof value === 'string' ? value : null
  }

  const resource = {
    type,
    ...(record.ownerId === null ? {} : { ownerId: record.ownerId }),
    ...('assigneeIds' in record ? { assigneeIds: record.assigneeIds } : {}),
  }

  return {
    fields,
    values,
    updatedAt: record.updatedAt,
    canEdit: deps.can(deps.actor, 'update', resource),
  }
}

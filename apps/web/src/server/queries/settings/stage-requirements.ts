import { STANDARD_STAGE_FIELDS } from '@ops/module-crm'
import { crmDeps } from '@/server/container'

/** Fields each pipeline stage may require: the record type's built-in fields, then its custom fields. */
export async function loadRequirementOptions(): Promise<
  Readonly<Record<string, readonly Readonly<{ key: string; label: string }>[]>>
> {
  const { repo } = await crmDeps()
  const entries = await Promise.all(
    (['lead', 'deal'] as const).map(async (type) => {
      const custom = await repo.loadFieldDefinitions(type)
      const standard = Object.entries(STANDARD_STAGE_FIELDS[type]).map(([key, label]) => ({ key, label }))
      return [type, [...standard, ...custom.map(({ key, label }) => ({ key, label }))]] as const
    }),
  )
  return Object.fromEntries(entries)
}

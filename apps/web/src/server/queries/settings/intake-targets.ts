import { crmDeps } from '@/server/container'

/** Built-in lead fields an intake answer can fill. */
const LEAD_TARGETS = [
  ['title', 'Lead title'],
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['companyName', 'Company'],
  ['notes', 'Notes'],
] as const

/** Where an intake answer can go: a built-in lead field, a lead custom field (`custom:<key>`), or nowhere. */
export async function loadIntakeTargets(): Promise<readonly Readonly<{ value: string; label: string }>[]> {
  const custom = await (await crmDeps()).repo.loadFieldDefinitions('lead')
  return [
    ...LEAD_TARGETS.map(([value, label]) => ({ value, label })),
    ...custom.map((field) => ({ value: `custom:${field.key}`, label: `${field.label} (custom field)` })),
    { value: 'ignore', label: 'Ignore this answer' },
  ]
}

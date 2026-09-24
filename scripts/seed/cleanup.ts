import { COLLECTIONS } from '../../packages/adapters/payload/src/contracts/names'
import { LOCAL, type SeedPayload } from './payload'

interface DeleteValuesInput {
  readonly collection: string
  readonly field: string
  readonly values: readonly string[]
}

async function removeByValues(payload: SeedPayload, input: DeleteValuesInput): Promise<void> {
  if (input.values.length === 0) return
  const { docs } = await payload.find({
    ...LOCAL,
    collection: input.collection,
    where: { [input.field]: { in: [...input.values] } },
    limit: 500,
  })
  for (const doc of docs) await payload.delete({ ...LOCAL, collection: input.collection, id: doc.id })
}

const LEGACY_DEALS = [
  'Website redesign engagement',
  'SEO growth retainer',
  'Spring campaign package',
  'Client portal build',
  'Brand identity project',
] as const

const LEGACY_LEADS = [
  'Website redesign inquiry',
  'SEO growth consultation',
  'Paid social launch',
  'Client portal discovery',
  'Brand refresh request',
] as const

const LEGACY_TASKS = [
  'Kick off Northstar delivery',
  'Kick off Harbor Pine delivery',
  'Audit current site pages',
  'Set up code repository',
  'Draft homepage wireframes',
  'Review hosting options',
  'Design style guide',
  'Build sign-in screen',
  'Write service page copy',
  'Plan launch checklist',
  'Build contact form',
  'Prepare app icon concepts',
  'Schedule kickoff meeting',
  'Research analytics tools',
] as const

const LEGACY_PROJECTS = ['Website redesign', 'Mobile app build', 'Northstar delivery', 'Harbor Pine delivery'] as const
const LEGACY_ORGANIZATIONS = ['Example Organization', 'Northstar Health Studio', 'Harbor & Pine Retail'] as const

async function removeLegacyContacts(payload: SeedPayload): Promise<void> {
  const { docs } = await payload.find({
    ...LOCAL,
    collection: COLLECTIONS.contacts,
    where: { email: { like: 'example.test' } },
    limit: 500,
  })
  for (const contact of docs) await payload.delete({ ...LOCAL, collection: COLLECTIONS.contacts, id: contact.id })
}

/** Removes the reserved-domain example CRM rows and generic work from the local seed workspace. */
export async function removeLegacyPlaceholderRecords(payload: SeedPayload): Promise<void> {
  await removeByValues(payload, { collection: COLLECTIONS.deals, field: 'title', values: LEGACY_DEALS })
  await removeByValues(payload, { collection: COLLECTIONS.leads, field: 'title', values: LEGACY_LEADS })
  await removeLegacyContacts(payload)
  await removeByValues(payload, { collection: COLLECTIONS.tasks, field: 'title', values: LEGACY_TASKS })
  await removeByValues(payload, { collection: COLLECTIONS.projects, field: 'name', values: LEGACY_PROJECTS })
  await removeByValues(payload, { collection: COLLECTIONS.organizations, field: 'name', values: LEGACY_ORGANIZATIONS })
}

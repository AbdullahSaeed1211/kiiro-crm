import { COLLECTIONS } from '../../packages/adapters/payload/src/contracts/names'
import {
  atDay,
  contactData,
  dealData,
  idOf,
  leadData,
  organizationData,
  type IdMap,
  type RecordContext,
  type WorkflowRef,
} from './build'
import { CONTACTS, DEALS, LEADS, LOST_REASONS, ORGANIZATIONS, SOURCES } from './crm-data'
import { equals, type Tally, upsert } from './common'
import { LOCAL, type Doc, type SeedPayload } from './payload'

interface CrmSeedInput {
  readonly now: number
  readonly users: IdMap
  readonly leadWorkflow: WorkflowRef
  readonly dealWorkflow: WorkflowRef
  readonly tally: Tally
}

interface LookupSeedInput {
  readonly collection: string
  readonly names: readonly string[]
  readonly tally: Tally
}

async function seedLookups(payload: SeedPayload, input: LookupSeedInput): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const name of input.names) {
    const doc = await upsert(
      payload,
      { collection: input.collection, where: { name: equals(name) }, data: () => ({ name }) },
      input.tally,
    )
    ids.set(name, doc.id)
  }
  return ids
}

async function seedOrganizations(payload: SeedPayload, input: CrmSeedInput, sources: IdMap): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const seed of ORGANIZATIONS) {
    const where =
      seed.previousName === undefined
        ? { name: equals(seed.name) }
        : { or: [{ name: equals(seed.name) }, { name: equals(seed.previousName) }] }
    const data = (): ReturnType<typeof organizationData> => organizationData(seed, input.users, sources)
    const doc = await upsert(
      payload,
      {
        collection: COLLECTIONS.organizations,
        where,
        data,
      },
      input.tally,
    )
    const next = data()
    const changed = Object.entries(next).some(([key, value]) => JSON.stringify(doc[key]) !== JSON.stringify(value))
    if (changed) {
      await payload.update({
        ...LOCAL,
        collection: COLLECTIONS.organizations,
        id: doc.id,
        data: next,
      })
    }
    ids.set(seed.key, doc.id)
  }
  return ids
}

async function seedContacts(payload: SeedPayload, input: CrmSeedInput, organizations: IdMap): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const seed of CONTACTS) {
    const doc = await upsert(
      payload,
      {
        collection: COLLECTIONS.contacts,
        where: { email: equals(seed.email) },
        data: () => contactData(seed, organizations, input.users),
      },
      input.tally,
    )
    ids.set(seed.key, doc.id)
  }
  return ids
}

async function seedLeads(
  payload: SeedPayload,
  input: CrmSeedInput,
  context: RecordContext & { readonly organizations: IdMap; readonly sources: IdMap; readonly lostReasons: IdMap },
): Promise<Map<string, Doc>> {
  const docs = new Map<string, Doc>()
  for (const seed of LEADS) {
    const doc = await upsert(
      payload,
      { collection: COLLECTIONS.leads, where: { title: equals(seed.title) }, data: () => leadData(seed, context) },
      input.tally,
    )
    docs.set(seed.key, doc)
  }
  return docs
}

async function seedDeals(
  payload: SeedPayload,
  input: CrmSeedInput,
  context: RecordContext & {
    readonly organizations: IdMap
    readonly contacts: IdMap
    readonly leads: IdMap
    readonly lostReasons: IdMap
  },
): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const seed of DEALS) {
    const doc = await upsert(
      payload,
      { collection: COLLECTIONS.deals, where: { title: equals(seed.title) }, data: () => dealData(seed, context) },
      input.tally,
    )
    ids.set(seed.key, doc.id)
  }
  return ids
}

async function linkConvertedLeads(
  payload: SeedPayload,
  input: { readonly leads: Map<string, Doc>; readonly deals: IdMap; readonly now: number },
): Promise<void> {
  for (const seed of LEADS.filter((lead) => lead.stage === 'Converted')) {
    const lead = input.leads.get(seed.key)
    const dealKey = seed.key === 'client-portal' ? 'portal-build' : undefined
    if (lead === undefined || dealKey === undefined) throw new Error(`converted lead "${seed.key}" has no deal`)
    const dealId = idOf(input.deals, dealKey)
    if (lead['convertedDeal'] !== dealId) {
      await payload.update({
        ...LOCAL,
        collection: COLLECTIONS.leads,
        id: lead.id,
        data: { convertedAt: atDay(input.now, -1), convertedDeal: dealId },
      })
    }
  }
}

/** Seeds agency lookups and CRM records, including the converted lead/deal link. */
export async function seedCrm(payload: SeedPayload, input: CrmSeedInput): Promise<IdMap> {
  const sources = await seedLookups(payload, { collection: COLLECTIONS.sources, names: SOURCES, tally: input.tally })
  const lostReasons = await seedLookups(payload, {
    collection: COLLECTIONS.lostReasons,
    names: LOST_REASONS,
    tally: input.tally,
  })
  const organizations = await seedOrganizations(payload, input, sources)
  const contacts = await seedContacts(payload, input, organizations)
  const leads = await seedLeads(payload, input, {
    now: input.now,
    users: input.users,
    workflow: input.leadWorkflow,
    organizations,
    sources,
    lostReasons,
  })
  const leadIds = new Map([...leads].map(([key, doc]) => [key, doc.id]))
  const deals = await seedDeals(payload, input, {
    now: input.now,
    users: input.users,
    workflow: input.dealWorkflow,
    organizations,
    contacts,
    leads: leadIds,
    lostReasons,
  })
  await linkConvertedLeads(payload, { leads, deals, now: input.now })
  return organizations
}

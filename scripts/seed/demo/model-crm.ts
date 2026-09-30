import { COMPANIES, SERVICES_BY_VERTICAL, type DemoCompany } from './companies'
import { need } from './need'
import { FIRST_NAMES, LAST_NAMES, SALES_KEYS } from './people'
import type { Random } from './random'
import type { DemoContact, DemoDeal, DemoLead, DemoOrg, StageStep } from './types'

const SOURCES = ['Website form', 'Referral', 'Ads', 'Social', 'Email', 'Phone/walk-in'] as const
const BUDGETS = ['Under 5k', '5k-20k', '20k-50k', '50k+'] as const
const LOST_REASONS = ['Budget', 'Timing', 'No response', 'Chose competitor', 'Not a fit'] as const
const LEAD_ORDER = ['New', 'Contacted', 'Qualified', 'Converted'] as const
const DEAL_ORDER = ['Discovery', 'Proposal sent', 'Negotiation', 'Won'] as const
const LEAD_ENDINGS = [
  ['New', 22],
  ['Contacted', 25],
  ['Qualified', 18],
  ['Converted', 15],
  ['Disqualified', 20],
] as const
const DEAL_ENDINGS = [
  ['Discovery', 18],
  ['Proposal sent', 24],
  ['Negotiation', 16],
  ['Won', 28],
  ['Lost', 14],
] as const
const LEAD_COUNT = 130
const DIRECT_DEAL_COUNT = 70

const SERVICE_CATEGORIES: readonly (readonly [RegExp, string])[] = [
  [/seo|content|keyword/u, 'SEO'],
  [/social|photography|video/u, 'Social media'],
  [/ads|paid|campaign|lead generation/u, 'Ads'],
  [/email/u, 'Email marketing'],
  [/brand|annual report/u, 'Branding'],
  [/app|portal|booking|flow/u, 'App development'],
  [/web|site|store|listings|ordering|redesign/u, 'Website'],
]

/** The custom-field option a service description belongs to. */
export function serviceCategory(service: string): string {
  const text = service.toLowerCase()
  return SERVICE_CATEGORIES.find(([pattern]) => pattern.test(text))?.[1] ?? 'Design'
}

const slug = (text: string): string => text.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '')
const domainOfOrg = (org: DemoOrg): string => org.website.replace('https://www.', '')
const lastStep = (path: readonly StageStep[]): StageStep => need(path.at(-1), 'a stage path')
const phone = (random: Random): string =>
  `+1 555-01${String(random.int(0, 99)).padStart(2, '0')}-${String(random.int(1000, 9999))}`

function companyOf(org: DemoOrg): DemoCompany {
  return need(
    COMPANIES.find((company) => company.name === org.name),
    `the company of ${org.name}`,
  )
}

/** One organization per company; the newest organizations are the newest customers. */
export function makeOrgs(random: Random): DemoOrg[] {
  return COMPANIES.map((company, index) => {
    const domain = `${slug(company.name)}.example.test`
    return {
      key: `org${String(index)}`,
      name: company.name,
      vertical: company.vertical,
      website: `https://www.${domain}`,
      phone: phone(random),
      email: `hello@${domain}`,
      ownerKey: random.pick(SALES_KEYS),
      createdDay: -random.int(40, 230),
    }
  })
}

/** Two to four people at each organization. */
export function makeContacts(random: Random, orgs: readonly DemoOrg[]): DemoContact[] {
  return orgs
    .flatMap((org) =>
      Array.from({ length: random.int(2, 4) }, () => {
        const firstName = random.pick(FIRST_NAMES)
        const lastName = random.pick(LAST_NAMES)
        return {
          key: '',
          orgKey: org.key,
          firstName,
          lastName,
          email: `${slug(firstName)}.${slug(lastName)}@${domainOfOrg(org)}`,
          phone: phone(random),
          ownerKey: org.ownerKey,
          subscribed: random.chance(0.6),
          createdDay: org.createdDay + random.int(0, 20),
        }
      }),
    )
    .map((contact, index) => ({ ...contact, key: `contact${String(index)}` }))
}

/** Stage history through `order[0..finalIndex]`, with the gaps a real pipeline has. */
function stagePath(
  random: Random,
  input: { readonly order: readonly string[]; readonly finalIndex: number; readonly createdDay: number },
): StageStep[] {
  const path: StageStep[] = []
  let day = input.createdDay
  for (const stage of input.order.slice(0, input.finalIndex + 1)) {
    path.push({ stage, day })
    day = Math.min(-1, day + random.int(2, 14))
  }
  return path
}

/** The path to `finalStage`, where a stage outside `order` (lost or disqualified) is reached from some earlier step. */
function pathTo(
  random: Random,
  input: {
    readonly order: readonly string[]
    readonly finalStage: string
    readonly createdDay: number
    readonly exitAfter: readonly [number, number]
  },
): StageStep[] {
  const { order, finalStage, createdDay } = input
  const index = order.indexOf(finalStage)
  if (index >= 0) return stagePath(random, { order, finalIndex: index, createdDay })
  const reached = stagePath(random, { order, finalIndex: random.int(0, 2), createdDay })
  return [...reached, { stage: finalStage, day: Math.min(-1, createdDay + random.int(...input.exitAfter)) }]
}

/** A lead from someone already in the address book about half the time, otherwise a new name. */
function leadPerson(
  random: Random,
  input: { readonly contacts: readonly DemoContact[]; readonly org: DemoOrg; readonly index: number },
) {
  const { org, index } = input
  const known = random.chance(0.5) ? input.contacts.find((contact) => contact.orgKey === org.key) : undefined
  const firstName = known?.firstName ?? random.pick(FIRST_NAMES)
  const lastName = known?.lastName ?? random.pick(LAST_NAMES)
  const email = known?.email ?? `${slug(firstName)}.${slug(lastName)}${String(index)}@${domainOfOrg(org)}`
  return { firstName, lastName, email }
}

function makeLead(
  random: Random,
  input: { readonly index: number; readonly orgs: readonly DemoOrg[]; readonly contacts: readonly DemoContact[] },
): DemoLead {
  const { index } = input
  const org = random.pick(input.orgs)
  const person = leadPerson(random, { contacts: input.contacts, org, index })
  const service = random.pick(SERVICES_BY_VERTICAL[companyOf(org).vertical])
  const finalStage = random.weighted(LEAD_ENDINGS)
  const createdDay = -random.int(2, 150)
  const open = finalStage !== 'Converted' && finalStage !== 'Disqualified'
  return {
    key: `lead${String(index)}`,
    title: `${service} for ${org.name}`,
    ...person,
    phone: phone(random),
    companyName: org.name,
    orgKey: random.chance(0.6) ? org.key : null,
    source: random.pick(SOURCES),
    ownerKey: random.pick(SALES_KEYS),
    path: pathTo(random, { order: LEAD_ORDER, finalStage, createdDay, exitAfter: [6, 40] }),
    createdDay,
    nextActionDay: open ? random.int(-6, 14) : null,
    service: serviceCategory(service),
    budget: random.pick(BUDGETS),
    lostReason: finalStage === 'Disqualified' ? random.pick(LOST_REASONS) : null,
    dealKey: null,
  }
}

/** Leads from prospects and from existing organizations; converted ones later get a deal. */
export function makeLeads(random: Random, orgs: readonly DemoOrg[], contacts: readonly DemoContact[]): DemoLead[] {
  return Array.from({ length: LEAD_COUNT }, (_, index) => makeLead(random, { index, orgs, contacts }))
}

function makeDeal(
  random: Random,
  input: {
    readonly key: string
    readonly org: DemoOrg
    readonly title: string
    readonly createdDay: number
    readonly contacts: readonly DemoContact[]
    readonly leadKey: string | null
  },
): DemoDeal {
  const { org, createdDay } = input
  const finalStage = random.weighted(DEAL_ENDINGS)
  const path = pathTo(random, { order: DEAL_ORDER, finalStage, createdDay, exitAfter: [8, 50] })
  const closed = finalStage === 'Won' || finalStage === 'Lost'
  const people = input.contacts.filter((contact) => contact.orgKey === org.key)
  return {
    key: input.key,
    title: input.title,
    orgKey: org.key,
    contactKeys: people.slice(0, random.int(1, 2)).map((contact) => contact.key),
    valueMajor: random.int(12, 160) * 5000,
    path,
    createdDay,
    expectedCloseDay: closed ? lastStep(path).day : random.int(5, 75),
    ownerKey: random.pick(SALES_KEYS),
    serviceLines: [serviceCategory(random.pick(SERVICES_BY_VERTICAL[companyOf(org).vertical]))],
    leadKey: input.leadKey,
    lostReason: finalStage === 'Lost' ? random.pick(LOST_REASONS) : null,
  }
}

interface DealInput {
  readonly random: Random
  readonly orgs: readonly DemoOrg[]
  readonly contacts: readonly DemoContact[]
  readonly leads: readonly DemoLead[]
}

/** A deal for every converted lead; the lead then points at it. */
function dealsFromLeads(input: DealInput): { deals: DemoDeal[]; leads: DemoLead[] } {
  const { random, orgs, contacts } = input
  const orgByName = new Map(orgs.map((org) => [org.name, org]))
  const deals: DemoDeal[] = []
  const leads = input.leads.map((lead) => {
    if (lastStep(lead.path).stage !== 'Converted') return lead
    const key = `deal${String(deals.length)}`
    const org = need(orgByName.get(lead.companyName), `the organization ${lead.companyName}`)
    deals.push(
      makeDeal(random, {
        key,
        org,
        title: lead.title,
        createdDay: lastStep(lead.path).day,
        contacts,
        leadKey: lead.key,
      }),
    )
    return { ...lead, dealKey: key }
  })
  return { deals, leads }
}

/** Deals: one for every converted lead, plus direct deals with existing clients. */
export function makeDeals(input: DealInput): { deals: DemoDeal[]; leads: DemoLead[] } {
  const { random, orgs, contacts } = input
  const { deals, leads } = dealsFromLeads(input)
  for (let extra = 0; extra < DIRECT_DEAL_COUNT; extra += 1) {
    const org = random.pick(orgs)
    const service = random.pick(SERVICES_BY_VERTICAL[companyOf(org).vertical])
    const key = `deal${String(deals.length)}`
    deals.push(
      makeDeal(random, {
        key,
        org,
        title: `${service} for ${org.name}`,
        createdDay: -random.int(3, 140),
        contacts,
        leadKey: null,
      }),
    )
  }
  return { deals, leads }
}

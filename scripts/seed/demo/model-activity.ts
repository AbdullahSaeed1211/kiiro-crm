import { CONTACT_NOTES, DEAL_NOTES, EMAIL_BODIES, EMAIL_REPLIES, EMAIL_SUBJECTS, LEAD_NOTES } from './content'
import { SALES_KEYS } from './people'
import type { Random } from './random'
import type { DemoCampaign, DemoContact, DemoDeal, DemoEmail, DemoLead, DemoNote, DemoOrg } from './types'

const fill = (text: string, values: Readonly<{ name: string; company: string }>): string =>
  text.replaceAll('{name}', values.name).replaceAll('{company}', values.company)

type NoteKind = DemoNote['recordType']

interface NoteSource {
  readonly recordType: NoteKind
  readonly key: string
  readonly authorKey: string
  readonly createdDay: number
  readonly name: string
  readonly company: string
  readonly lines: readonly string[]
  readonly span: number
}

/** One to `count` notes on a record, dated along its early life. */
function notesFor(random: Random, source: NoteSource, count: number): DemoNote[] {
  return Array.from({ length: count }, () => ({
    recordType: source.recordType,
    recordKey: source.key,
    authorKey: source.authorKey,
    body: fill(random.pick(source.lines), { name: source.name, company: source.company }),
    day: Math.min(-1, source.createdDay + random.int(0, source.span)),
  }))
}

interface NoteInput {
  readonly random: Random
  readonly leads: readonly DemoLead[]
  readonly deals: readonly DemoDeal[]
  readonly contacts: readonly DemoContact[]
  readonly orgs: readonly DemoOrg[]
}

function noteSources(input: NoteInput): { leads: NoteSource[]; deals: NoteSource[]; contacts: NoteSource[] } {
  const { random, contacts } = input
  const orgName = new Map(input.orgs.map((org) => [org.key, org.name]))
  const firstName = new Map(contacts.map((contact) => [contact.key, contact.firstName]))
  return {
    leads: input.leads.map((lead) => ({
      recordType: 'lead',
      key: lead.key,
      authorKey: random.pick(SALES_KEYS),
      createdDay: lead.createdDay,
      name: lead.firstName,
      company: lead.companyName,
      lines: LEAD_NOTES,
      span: 20,
    })),
    deals: input.deals.map((deal) => ({
      recordType: 'deal',
      key: deal.key,
      authorKey: deal.ownerKey,
      createdDay: deal.createdDay,
      name: firstName.get(deal.contactKeys[0] ?? '') ?? 'the client',
      company: orgName.get(deal.orgKey) ?? 'the client',
      lines: DEAL_NOTES,
      span: 25,
    })),
    contacts: contacts.map((contact) => ({
      recordType: 'contact',
      key: contact.key,
      authorKey: contact.ownerKey,
      createdDay: contact.createdDay,
      name: contact.firstName,
      company: orgName.get(contact.orgKey) ?? 'the client',
      lines: CONTACT_NOTES,
      span: 30,
    })),
  }
}

/** Notes on most leads and deals and a few contacts. */
export function makeNotes(input: NoteInput): DemoNote[] {
  const { random } = input
  const sources = noteSources(input)
  const some = (list: readonly NoteSource[], chance: number, most: number): DemoNote[] =>
    list.filter(() => random.chance(chance)).flatMap((source) => notesFor(random, source, random.int(1, most)))
  return [...some(sources.leads, 0.8, 3), ...some(sources.deals, 0.8, 3), ...some(sources.contacts, 0.18, 1)]
}

interface ThreadTarget {
  readonly type: 'lead' | 'contact'
  readonly key: string
  readonly name: string
  readonly company: string
  readonly address: string
  readonly day: number
}

/** An outbound message and, most of the time, a reply a few days later. */
function threadFor(random: Random, target: ThreadTarget, sender: string): DemoEmail[] {
  const subject = fill(random.pick(EMAIL_SUBJECTS), { name: target.name, company: target.company })
  const sent = Math.min(-1, target.day)
  const id = `demo-${target.type}-${target.key}`
  const outbound: DemoEmail = {
    recordType: target.type,
    recordKey: target.key,
    direction: 'outbound',
    fromName: 'Demo Agency',
    fromAddress: sender,
    toAddress: target.address,
    subject,
    body: fill(random.pick(EMAIL_BODIES), { name: target.name, company: target.company }),
    day: sent,
    id,
  }
  if (!random.chance(0.65)) return [outbound]
  const reply: DemoEmail = {
    ...outbound,
    direction: 'inbound',
    fromName: target.name,
    fromAddress: target.address,
    toAddress: sender,
    subject: `Re: ${subject}`,
    body: random.pick(EMAIL_REPLIES),
    day: Math.min(-1, sent + random.int(0, 3)),
    id: `${id}-reply`,
  }
  return [outbound, reply]
}

/** Email threads on roughly a third of leads and a few contacts. */
export function makeEmails(input: {
  readonly random: Random
  readonly leads: readonly DemoLead[]
  readonly contacts: readonly DemoContact[]
  readonly senderAddress: string
}): DemoEmail[] {
  const { random, senderAddress } = input
  const leadTargets: ThreadTarget[] = input.leads
    .filter(() => random.chance(0.35))
    .map((lead) => ({
      type: 'lead',
      key: lead.key,
      name: lead.firstName,
      company: lead.companyName,
      address: lead.email,
      day: lead.createdDay + random.int(1, 12),
    }))
  const contactTargets: ThreadTarget[] = input.contacts
    .filter(() => random.chance(0.15))
    .map((contact) => ({
      type: 'contact',
      key: contact.key,
      name: contact.firstName,
      company: 'your team',
      address: contact.email,
      day: contact.createdDay + random.int(5, 50),
    }))
  return [...leadTargets, ...contactTargets].flatMap((target) => threadFor(random, target, senderAddress))
}

const CAMPAIGNS = [
  [
    'Autumn offers for your website',
    'Three quick wins to lift your enquiries this autumn: faster pages, clearer calls to action and a refreshed Google profile. Reply to book a free 20-minute review.',
  ],
  [
    'What our clients achieved this quarter',
    'A short round-up of launches, results and lessons from the last three months, plus one idea you can try this week.',
  ],
  [
    'New: monthly reporting dashboard',
    'Every retainer client now gets a live dashboard. See traffic, leads and campaign spend in one place. Ask us for a walkthrough.',
  ],
] as const

/** Three past newsletters sent to everyone subscribed at the time. */
export function makeCampaigns(random: Random, contacts: readonly DemoContact[]): DemoCampaign[] {
  const subscribers = contacts.filter((contact) => contact.subscribed)
  return CAMPAIGNS.map(([subject, body], index) => {
    const day = -(70 - index * 25)
    return {
      id: `demo-campaign-${String(index)}`,
      subject,
      body,
      day,
      contactKeys: subscribers
        .filter((contact) => contact.createdDay < day - 1 || random.chance(0.1))
        .map((contact) => contact.key),
    }
  })
}

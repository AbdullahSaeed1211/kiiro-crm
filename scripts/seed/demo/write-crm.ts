import { COLLECTIONS, at, createDoc, idFor, type WriteContext } from './context'
import { need } from './need'
import type { Workflows } from './write-base'
import type { DemoDataset, DemoDeal, StageStep } from './types'

export interface CrmLookups {
  readonly workflows: Workflows
  readonly sources: ReadonlyMap<string, string>
  readonly lostReasons: ReadonlyMap<string, string>
  readonly currency: string
}

export async function writeOrgsAndContacts(context: WriteContext, data: DemoDataset): Promise<void> {
  const clients = new Set(data.deals.filter((deal) => deal.path.at(-1)?.stage === 'Won').map((deal) => deal.orgKey))
  for (const org of data.orgs) {
    await createDoc(context, {
      collection: COLLECTIONS.organizations,
      key: org.key,
      day: org.createdDay,
      data: {
        name: org.name,
        website: org.website,
        phone: org.phone,
        email: org.email,
        owner: idFor(context, org.ownerKey),
        customData: {},
      },
    })
  }
  for (const contact of data.contacts) {
    const audience = clients.has(contact.orgKey) ? 'Clients' : 'Prospects'
    await createDoc(context, {
      collection: COLLECTIONS.contacts,
      key: contact.key,
      day: contact.createdDay,
      data: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        organization: idFor(context, contact.orgKey),
        owner: idFor(context, contact.ownerKey),
        customData: contact.subscribed ? { newsletter: true, audiences: [audience] } : {},
      },
    })
  }
}

function stageOf(lookups: CrmLookups, recordType: 'lead' | 'deal', path: readonly StageStep[]) {
  const workflow = lookups.workflows[recordType]
  const last = need(path.at(-1), 'a stage path')
  const stage = workflow.stages.get(last.stage)
  if (stage === undefined) throw new Error(`unknown ${recordType} stage ${last.stage}`)
  return { workflow: workflow.id, stageId: stage.id, last }
}

export async function writeLeads(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly lookups: CrmLookups },
): Promise<void> {
  const { data, lookups } = input
  for (const lead of data.leads) {
    const { workflow, stageId, last } = stageOf(lookups, 'lead', lead.path)
    await createDoc(context, {
      collection: COLLECTIONS.leads,
      key: lead.key,
      day: lead.createdDay,
      data: {
        title: lead.title,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        organization: lead.orgKey === null ? null : idFor(context, lead.orgKey),
        source: lookups.sources.get(lead.source) ?? null,
        owner: idFor(context, lead.ownerKey),
        assignees: [],
        workflow,
        stageId,
        stageEnteredAt: at(context, last.day),
        lostReason: lead.lostReason === null ? null : (lookups.lostReasons.get(lead.lostReason) ?? null),
        nextActionAt: lead.nextActionDay === null ? null : at(context, lead.nextActionDay),
        convertedAt: last.stage === 'Converted' ? at(context, last.day) : null,
        customData: { service: lead.service, budget: lead.budget },
      },
    })
  }
}

function dealDocument(
  context: WriteContext,
  input: { readonly deal: DemoDeal; readonly lookups: CrmLookups },
): Record<string, unknown> {
  const { deal, lookups } = input
  const { workflow, stageId, last } = stageOf(lookups, 'deal', deal.path)
  const closed = last.stage === 'Won' || last.stage === 'Lost'
  return {
    title: deal.title,
    organization: idFor(context, deal.orgKey),
    contacts: deal.contactKeys.map((key) => idFor(context, key)),
    primaryContact: idFor(context, need(deal.contactKeys[0], 'a deal contact')),
    valueAmountMinor: deal.valueMajor * 100,
    valueCurrency: lookups.currency,
    expectedCloseAt: at(context, deal.expectedCloseDay),
    closedAt: closed ? at(context, last.day) : null,
    owner: idFor(context, deal.ownerKey),
    assignees: [],
    workflow,
    stageId,
    stageEnteredAt: at(context, last.day),
    sourceLead: deal.leadKey === null ? null : idFor(context, deal.leadKey),
    lostReason: deal.lostReason === null ? null : (lookups.lostReasons.get(deal.lostReason) ?? null),
    customData: { serviceLines: [...deal.serviceLines] },
  }
}

export async function writeDeals(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly lookups: CrmLookups },
): Promise<void> {
  const { data, lookups } = input
  for (const deal of data.deals) {
    await createDoc(context, {
      collection: COLLECTIONS.deals,
      key: deal.key,
      day: deal.createdDay,
      data: dealDocument(context, { deal, lookups }),
    })
  }
  for (const lead of data.leads.filter((candidate) => candidate.dealKey !== null)) {
    await context.payload.update({
      overrideAccess: true,
      depth: 0,
      context: { authOperation: 'provisioning' },
      collection: COLLECTIONS.leads,
      id: idFor(context, lead.key),
      data: { convertedDeal: idFor(context, need(lead.dealKey, 'the converted deal')) },
    })
  }
}

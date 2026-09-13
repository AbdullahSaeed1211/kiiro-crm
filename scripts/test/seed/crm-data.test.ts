import { describe, expect, it } from 'vitest'
import { contactData, dealData, leadData, organizationData, stageIdsOf, workflowData } from '../../seed/build'
import { CONTACTS, CRM_WORKFLOWS, DEALS, LEADS, LOST_REASONS, ORGANIZATIONS, SOURCES } from '../../seed/crm-data'
import { USERS } from '../../seed/data'

const ids = (keys: readonly string[]): Map<string, string> => new Map(keys.map((key) => [key, `id-${key}`]))
const itemAt = <T>(items: readonly T[], index: number): T => {
  const item = items[index]
  if (item === undefined) throw new Error(`missing test item at ${String(index)}`)
  return item
}
const workflow = (index: number) => ({
  id: `wf-${String(index)}`,
  stageIds: stageIdsOf(workflowData(itemAt(CRM_WORKFLOWS, index), () => 'stage-id')),
})

describe('CRM seed data', () => {
  it('declares every agency lookup and covers both five-stage pipelines', () => {
    expect(SOURCES).toEqual(['Website form', 'Referral', 'Ads', 'Social', 'Email', 'Phone/walk-in'])
    expect(LOST_REASONS).toEqual(['Budget', 'Timing', 'No response', 'Chose competitor', 'Not a fit'])
    expect(CRM_WORKFLOWS.map((item) => item.stages)).toEqual([
      [
        { name: 'New', category: 'open', color: 'blue' },
        { name: 'Contacted', category: 'active', color: 'amber' },
        { name: 'Qualified', category: 'active', color: 'violet' },
        { name: 'Converted', category: 'done_success', color: 'green' },
        { name: 'Disqualified', category: 'done_failure', color: 'red' },
      ],
      [
        { name: 'Discovery', category: 'active', color: 'blue', probability: 10 },
        { name: 'Proposal sent', category: 'active', color: 'amber', probability: 40 },
        { name: 'Negotiation', category: 'waiting', color: 'violet', probability: 70 },
        { name: 'Won', category: 'done_success', color: 'green', probability: 100 },
        { name: 'Lost', category: 'done_failure', color: 'red', probability: 0 },
      ],
    ])
  })

  it('keeps seed keys and titles, emails, and contacts unique', () => {
    expect(new Set(ORGANIZATIONS.map((item) => item.key)).size).toBe(ORGANIZATIONS.length)
    expect(new Set(CONTACTS.map((item) => item.email)).size).toBe(CONTACTS.length)
    expect(new Set(LEADS.map((item) => item.title)).size).toBe(LEADS.length)
    expect(new Set(DEALS.map((item) => item.title)).size).toBe(DEALS.length)
    expect(LEADS.filter((item) => item.stage === 'Converted')).toHaveLength(1)
    expect(DEALS.map((item) => item.stage)).toEqual(['Discovery', 'Proposal sent', 'Negotiation', 'Won', 'Lost'])
  })
})

describe('CRM seed builders', () => {
  const users = ids(USERS.map((user) => user.key))
  const organizations = ids(ORGANIZATIONS.map((organization) => organization.key))
  const contacts = ids(CONTACTS.map((contact) => contact.key))
  const leads = ids(LEADS.map((lead) => lead.key))
  const sources = ids(SOURCES)
  const lostReasons = ids(LOST_REASONS)

  it('links organization, contact, pipeline, and custom fields', () => {
    expect(organizationData(itemAt(ORGANIZATIONS, 1), users, sources)).toMatchObject({
      owner: 'id-manager',
      source: 'id-Referral',
      customData: {},
    })
    expect(contactData(itemAt(CONTACTS, 0), organizations, users)).toMatchObject({
      organization: 'id-example',
      owner: 'id-manager',
    })
    expect(
      leadData(itemAt(LEADS, 3), { now: 0, users, workflow: workflow(0), organizations, sources, lostReasons }),
    ).toMatchObject({
      organization: 'id-northstar',
      source: 'id-Email',
      stageId: 'stage-id',
      convertedAt: -86_400_000,
      customData: { service: 'App development', budget: '$20k+' },
    })
    expect(
      dealData(itemAt(DEALS, 3), { now: 0, users, workflow: workflow(1), organizations, contacts, leads, lostReasons }),
    ).toMatchObject({
      organization: 'id-northstar',
      contacts: ['id-elena', 'id-marcus'],
      primaryContact: 'id-elena',
      sourceLead: 'id-client-portal',
      closedAt: -172_800_000,
      customData: { serviceLines: ['App development'] },
    })
  })
})

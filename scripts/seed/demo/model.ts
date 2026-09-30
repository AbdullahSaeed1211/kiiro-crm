import { makeCampaigns, makeEmails, makeNotes } from './model-activity'
import { makeContacts, makeDeals, makeLeads, makeOrgs } from './model-crm'
import { makeProjects, makeTasks } from './model-work'
import { createRandom } from './random'
import type { DemoDataset } from './types'

/** The whole demo workspace as plain data; the same seed always gives the same data. */
export function buildDemoDataset(senderAddress: string, seed = 20261001): DemoDataset {
  const random = createRandom(seed)
  const orgs = makeOrgs(random)
  const contacts = makeContacts(random, orgs)
  const firstLeads = makeLeads(random, orgs, contacts)
  const { deals, leads } = makeDeals({ random, orgs, contacts, leads: firstLeads })
  const projects = makeProjects(random, deals, orgs)
  const tasks = makeTasks(random, projects)
  const notes = makeNotes({ random, leads, deals, contacts, orgs })
  const emails = makeEmails({ random, leads, contacts, senderAddress })
  const campaigns = makeCampaigns(random, contacts)
  return { orgs, contacts, leads, deals, projects, tasks, notes, emails, campaigns }
}

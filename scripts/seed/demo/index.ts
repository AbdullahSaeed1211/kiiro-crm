import { randomBytes } from 'node:crypto'
import {
  appendDemoEntries,
  purgeDemoRecords,
  readDemoEntries,
  type DemoStore,
} from '../../../packages/adapters/payload/src/demo-records'
import { DEV_PASSWORD } from '../data'
import { LOCAL, type SeedPayload } from '../payload'
import { seedAll } from '../steps'
import type { WriteContext } from './context'
import { buildDemoDataset } from './model'
import { need } from './need'
import { writeActivityAll } from './write-all'
import {
  applySettings,
  ensureFieldDefinitions,
  ensureTeam,
  ensureWorkspaceCast,
  findWorkspaceOwner,
  loadBaseUsers,
  loadLookups,
  loadWorkflows,
} from './write-base'
import { writeDeals, writeLeads, writeOrgsAndContacts } from './write-crm'
import { writeProjects, writeTasks } from './write-work'

const SENDER = 'no-reply@demo.example.test'

/** Summary of what a run did, one count per kind of record. */
export type DemoCounts = Readonly<Record<string, number>>

/** How the demo is added: onto the local seed, or onto a real workspace without touching its settings or accounts. */
export interface DemoOptions {
  readonly workspace?: boolean
}

const store = (payload: SeedPayload): DemoStore => payload as unknown as DemoStore

/** The four base users as a write context, ready to add records to. */
async function startContext(payload: SeedPayload, now: number): Promise<WriteContext> {
  const users = await loadBaseUsers(payload)
  const ids = new Map([...users].map(([key, doc]) => [key, doc.id]))
  return {
    payload,
    now,
    ids,
    manifest: [],
    owner: need(users.get('owner'), 'the owner user'),
    users,
    password: DEV_PASSWORD,
  }
}

/** A write context for a real workspace: its own owner, and demo users with passwords nobody knows. */
async function workspaceContext(payload: SeedPayload, now: number): Promise<WriteContext> {
  const owner = await findWorkspaceOwner(payload)
  const context: WriteContext = {
    payload,
    now,
    ids: new Map([['owner', owner.id]]),
    manifest: [],
    owner,
    users: new Map([['owner', owner]]),
    password: randomBytes(24).toString('hex'),
  }
  await ensureWorkspaceCast(context)
  return context
}

async function writeAll(context: WriteContext, options: DemoOptions): Promise<void> {
  const { payload } = context
  await ensureTeam(context)
  await ensureFieldDefinitions(context)
  const [workflows, lookups] = await Promise.all([loadWorkflows(payload), loadLookups(payload)])
  const data = buildDemoDataset(SENDER)
  const settings = await payload.findGlobal({ ...LOCAL, slug: 'settings' })
  const currency = typeof settings['currency'] === 'string' ? settings['currency'] : 'USD'
  const crm = { workflows, sources: lookups.sources, lostReasons: lookups.lostReasons, currency }
  await writeOrgsAndContacts(context, data)
  await writeLeads(context, { data, lookups: crm })
  await writeDeals(context, { data, lookups: crm })
  await writeProjects(context, { data, workflows })
  await writeTasks(context, { data, workflows })
  await writeActivityAll(context, { data, workflows, sender: SENDER })
  if (options.workspace !== true) await applySettings(payload)
}

/** Adds the rich demo workspace. Refuses to run twice so the data is not doubled. */
export async function seedDemo(payload: SeedPayload, now: number, options: DemoOptions = {}): Promise<DemoCounts> {
  if ((await readDemoEntries(store(payload))).length > 0)
    throw new Error('Demo data is already present. Run the purge first.')
  if (options.workspace !== true) await seedAll(payload, now)
  const context = options.workspace === true ? await workspaceContext(payload, now) : await startContext(payload, now)
  try {
    await writeAll(context, options)
  } finally {
    // Even after a failure the record lists what was created, so a purge can clean up the partial run.
    await appendDemoEntries(store(payload), context.manifest)
  }
  const counts: Record<string, number> = {}
  for (const entry of context.manifest) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1
  return counts
}

/** Removes exactly the documents the last demo run created. Returns how many were removed per kind. */
export function purgeDemo(payload: SeedPayload): Promise<DemoCounts> {
  return purgeDemoRecords(store(payload))
}

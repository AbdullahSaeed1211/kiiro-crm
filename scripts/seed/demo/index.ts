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
import { findDemoEntries } from './reconcile'
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

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** Saves the list of what was made, trying again when a live database answers with a passing error. */
async function saveWithRetry(save: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await save()
      return
    } catch (error) {
      if (attempt >= 4) throw error
      await pause(2000 * attempt)
    }
  }
}

/**
 * Lists everything the demo made, including a document that was being written when a run stopped, so one purge removes
 * it all. Entries already on the list are not added again.
 */
export async function reconcileDemo(payload: SeedPayload, since: number): Promise<number> {
  const known = new Set((await readDemoEntries(store(payload))).map((entry) => entry.id))
  const missing = (await findDemoEntries(payload, since, SENDER)).filter((entry) => !known.has(entry.id))
  await saveWithRetry(() => appendDemoEntries(store(payload), missing))
  return missing.length
}

/** Runs the writers; if one fails, lists what was made so one purge removes it, then raises the real error. */
async function writeOrRecord(context: WriteContext, input: { options: DemoOptions; started: number }): Promise<void> {
  try {
    await writeAll(context, input.options)
  } catch (error) {
    await reconcileDemo(context.payload, input.started)
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `The demo run stopped: ${reason}. What it made so far is on the purge list; purge, then run it again.`,
    )
  }
}

/** Adds the rich demo workspace. Refuses to run twice so the data is not doubled. */
export async function seedDemo(payload: SeedPayload, now: number, options: DemoOptions = {}): Promise<DemoCounts> {
  if ((await readDemoEntries(store(payload))).length > 0)
    throw new Error('Demo data is already present. Run the purge first.')
  if (options.workspace !== true) await seedAll(payload, now)
  const started = Date.now() - 60_000
  const context = options.workspace === true ? await workspaceContext(payload, now) : await startContext(payload, now)
  await writeOrRecord(context, { options, started })
  await saveWithRetry(() => appendDemoEntries(store(payload), context.manifest))
  const counts: Record<string, number> = {}
  for (const entry of context.manifest) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1
  return counts
}

/** Removes exactly the documents the last demo run created. Returns how many were removed per kind. */
export function purgeDemo(payload: SeedPayload): Promise<DemoCounts> {
  return purgeDemoRecords(store(payload))
}

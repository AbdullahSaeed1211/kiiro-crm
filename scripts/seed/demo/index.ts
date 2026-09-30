import { LOCAL, type SeedPayload } from '../payload'
import { seedAll } from '../steps'
import type { WriteContext } from './context'
import { readManifest, removeManifest, writeManifest } from './manifest'
import { buildDemoDataset } from './model'
import { need } from './need'
import { writeActivityAll } from './write-all'
import {
  applySettings,
  ensureFieldDefinitions,
  ensureTeam,
  loadBaseUsers,
  loadLookups,
  loadWorkflows,
} from './write-base'
import { writeDeals, writeLeads, writeOrgsAndContacts } from './write-crm'
import { writeProjects, writeTasks } from './write-work'

const SENDER = 'no-reply@demo.example.test'

/** Summary of what a run did, one count per kind of record. */
export type DemoCounts = Readonly<Record<string, number>>

/** The four base users as a write context, ready to add records to. */
async function startContext(payload: SeedPayload, now: number): Promise<WriteContext> {
  const users = await loadBaseUsers(payload)
  const ids = new Map([...users].map(([key, doc]) => [key, doc.id]))
  return { payload, now, ids, manifest: [], owner: need(users.get('owner'), 'the owner user'), users }
}

async function writeAll(context: WriteContext): Promise<void> {
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
  await applySettings(payload)
}

/** Adds the rich demo workspace on top of the base seed. Refuses to run twice so the data is not doubled. */
export async function seedDemo(payload: SeedPayload, now: number): Promise<DemoCounts> {
  if (readManifest().length > 0) throw new Error('Demo data is already present. Run `pnpm seed:purge` first.')
  await seedAll(payload, now)
  const context = await startContext(payload, now)
  try {
    await writeAll(context)
  } finally {
    // Even after a failure the manifest lists what was created, so a purge can clean up the partial run.
    writeManifest(context.manifest)
  }
  const counts: Record<string, number> = {}
  for (const entry of context.manifest) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1
  return counts
}

// Children first, so a record is never deleted while something still points at it.
const PURGE_ORDER = [
  'comments',
  'emailMessages',
  'activity',
  'stageTransitions',
  'tasks',
  'projects',
  'deals',
  'leads',
  'contacts',
  'organizations',
  'fieldDefinitions',
  'users',
]

/** Removes exactly the documents the last demo run created. Returns how many were removed per collection. */
export async function purgeDemo(payload: SeedPayload): Promise<DemoCounts> {
  const entries = readManifest()
  const removed: Record<string, number> = {}
  for (const collection of PURGE_ORDER) {
    const ids = entries.filter((entry) => entry.collection === collection).map((entry) => entry.id)
    // The database adapter skips collection hooks; a comment's own hook refuses deletion through the API.
    for (let start = 0; start < ids.length; start += 100) {
      await payload.db.deleteMany({ collection, where: { id: { in: ids.slice(start, start + 100) } } })
    }
    if (ids.length > 0) removed[collection] = ids.length
  }
  removeManifest()
  return removed
}

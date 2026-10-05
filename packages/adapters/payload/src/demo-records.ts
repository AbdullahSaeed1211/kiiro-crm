import { COLLECTIONS } from './contracts/names'

/** The parts of Payload the demo bookkeeping uses, so scripts and the app can share it. */
export interface DemoStore {
  find(args: Record<string, unknown>): Promise<{ docs: readonly Record<string, unknown>[] }>
  create(args: Record<string, unknown>): Promise<unknown>
  db: { deleteMany(args: { collection: string; where: Record<string, unknown> }): Promise<unknown> }
}

/** A document the demo created. */
export interface DemoEntry {
  readonly collection: string
  readonly id: string
}

const ACCESS = { overrideAccess: true, depth: 0, context: { authOperation: 'provisioning' } } as const
const BATCH = 400
/** D1 binds at most 100 variables per statement. */
const ID_CHUNK = 80

// Children first, so a record is never deleted while something still points at it.
const PURGE_ORDER = [
  'timeEntries',
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
  'sources',
  'lostReasons',
  'users',
] as const

/** Every entry recorded so far, in the order it was written. */
export async function readDemoEntries(store: DemoStore): Promise<DemoEntry[]> {
  const found = await store.find({
    ...ACCESS,
    collection: COLLECTIONS.demoManifests,
    where: {},
    sort: 'part',
    limit: 0,
    pagination: false,
  })
  return found.docs.flatMap((doc) => (Array.isArray(doc['entries']) ? (doc['entries'] as DemoEntry[]) : []))
}

/** Records more created documents, as a few batches after the ones already stored. */
export async function appendDemoEntries(store: DemoStore, entries: readonly DemoEntry[]): Promise<void> {
  const existing = await store.find({
    ...ACCESS,
    collection: COLLECTIONS.demoManifests,
    where: {},
    sort: '-part',
    limit: 1,
  })
  let part = typeof existing.docs[0]?.['part'] === 'number' ? existing.docs[0]['part'] + 1 : 0
  for (let at = 0; at < entries.length; at += BATCH) {
    await store.create({
      ...ACCESS,
      collection: COLLECTIONS.demoManifests,
      data: { part, entries: entries.slice(at, at + BATCH) },
    })
    part += 1
  }
}

/** How many demo documents exist, by kind. */
export async function demoCounts(store: DemoStore): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const entry of await readDemoEntries(store)) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1
  return counts
}

/**
 * Removes exactly the documents the demo recorded, then the record itself. The database adapter skips collection
 * hooks, which a comment's own hook would otherwise use to refuse the delete. Returns how many were removed by kind.
 */
export async function purgeDemoRecords(store: DemoStore): Promise<Record<string, number>> {
  const entries = await readDemoEntries(store)
  const removed: Record<string, number> = {}
  for (const collection of PURGE_ORDER) {
    const ids = entries.filter((entry) => entry.collection === collection).map((entry) => entry.id)
    for (let at = 0; at < ids.length; at += ID_CHUNK) {
      const chunk = ids.slice(at, at + ID_CHUNK)
      // A person's notifications cannot outlive them: their user column is required, so it cannot be cleared.
      if (collection === 'users')
        await store.db.deleteMany({ collection: 'notifications', where: { user: { in: chunk } } })
      await store.db.deleteMany({ collection, where: { id: { in: chunk } } })
    }
    if (ids.length > 0) removed[collection] = ids.length
  }
  await store.db.deleteMany({ collection: COLLECTIONS.demoManifests, where: {} })
  return removed
}

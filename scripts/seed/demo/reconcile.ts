import type { DemoEntry } from '../../../packages/adapters/payload/src/demo-records'
import type { SeedPayload } from '../payload'
import { buildDemoDataset } from './model'
import type { DemoDataset } from './types'

type Row = Record<string, unknown> & { id: string }
type Reader = (collection: string) => Promise<Row[]>

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const ref = (value: unknown): string =>
  typeof value === 'object' && value !== null ? str((value as { id?: unknown }).id) : str(value)

interface Finder {
  find(args: object): Promise<{ docs: Row[] }>
}

function reader(payload: SeedPayload): Reader {
  const finder = payload as unknown as Finder
  return async (collection) =>
    (
      await finder.find({
        collection,
        where: {},
        limit: 0,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        context: { authOperation: 'provisioning' },
      })
    ).docs
}

/** Collects entries as it goes, handing back the ids of each batch so the next step can find what hangs off it. */
class Found {
  readonly entries: DemoEntry[] = []

  take(collection: string, rows: readonly Row[]): Set<string> {
    for (const row of rows) this.entries.push({ collection, id: row.id })
    return new Set(rows.map((row) => row.id))
  }
}

/** The custom fields the demo adds, as record type and key; any other field is not the demo's. */
const DEMO_FIELDS = new Set([
  'lead.service',
  'lead.budget',
  'deal.serviceLines',
  'contact.newsletter',
  'lead.newsletter',
  'contact.audiences',
])

/** The clients, people, deals, projects and tasks, matched on the names and emails the generator always writes. */
async function business(read: Reader, data: DemoDataset, found: Found) {
  const names = new Set(data.orgs.map((org) => org.name))
  const orgs = found.take(
    'organizations',
    (await read('organizations')).filter((row) => names.has(str(row['name']))),
  )
  const emails = new Set(data.contacts.map((contact) => contact.email))
  const contacts = found.take(
    'contacts',
    (await read('contacts')).filter((row) => emails.has(str(row['email']))),
  )
  const leadKeys = new Set(data.leads.map((lead) => `${lead.email}|${lead.title}`))
  const leads = found.take(
    'leads',
    (await read('leads')).filter((row) => leadKeys.has(`${str(row['email'])}|${str(row['title'])}`)),
  )
  const dealTitles = new Set(data.deals.map((deal) => deal.title))
  const deals = found.take(
    'deals',
    (await read('deals')).filter((row) => dealTitles.has(str(row['title'])) && orgs.has(ref(row['organization']))),
  )
  const projectNames = new Set(data.projects.map((project) => project.name))
  const projects = found.take(
    'projects',
    (await read('projects')).filter((row) => projectNames.has(str(row['name'])) && orgs.has(ref(row['organization']))),
  )
  const tasks = found.take(
    'tasks',
    (await read('tasks')).filter((row) => projects.has(ref(row['project']))),
  )
  return { orgs, contacts, leads, deals, tasks }
}

/** History, time, notes and emails that belong to the demo's records. */
async function attached(read: Reader, ids: Awaited<ReturnType<typeof business>>, found: Found): Promise<void> {
  found.take(
    'timeEntries',
    (await read('timeEntries')).filter((row) => ids.tasks.has(ref(row['task']))),
  )
  const records = new Set([...ids.leads, ...ids.deals, ...ids.contacts])
  for (const collection of ['comments', 'emailMessages', 'stageTransitions']) {
    found.take(
      collection,
      (await read(collection)).filter((row) => records.has(str(row['recordId']))),
    )
  }
  found.take(
    'activity',
    (await read('activity')).filter((row) => records.has(str(row['recordId'])) || ids.orgs.has(str(row['recordId']))),
  )
}

/**
 * Finds every document the demo data made, by what the generator always writes and by the records that hang off those.
 * It is how a run that stopped part-way, or lost its list, still gets a complete list to purge. `since` is when the run
 * began, which separates the demo's users and fields from ones that were already there.
 */
export async function findDemoEntries(payload: SeedPayload, since: number, sender: string): Promise<DemoEntry[]> {
  const read = reader(payload)
  const found = new Found()
  const ids = await business(read, buildDemoDataset(sender), found)
  const cast = new Set(['manager@example.test', 'staff1@example.test', 'staff2@example.test'])
  const madeNow = (row: Row): boolean => Date.parse(str(row['createdAt'])) >= since
  const demoUser = (row: Row): boolean =>
    str(row['email']).endsWith('@demo.example.test') || cast.has(str(row['email']))
  found.take(
    'users',
    (await read('users')).filter((row) => madeNow(row) && demoUser(row)),
  )
  found.take(
    'fieldDefinitions',
    (await read('fieldDefinitions')).filter(
      (row) => madeNow(row) && DEMO_FIELDS.has(`${str(row['recordType'])}.${str(row['key'])}`),
    ),
  )
  await attached(read, ids, found)
  return found.entries
}

import { COLLECTIONS, SETTINGS_GLOBAL } from '../../packages/adapters/payload/src/contracts/names'
import {
  idOf,
  projectData,
  stageIdsOf,
  taskData,
  userData,
  workflowData,
  type IdMap,
  type RecordContext,
  type WorkflowRef,
} from './build'
import {
  APP_SETTINGS,
  GROUPS,
  ORGANIZATION,
  PROJECT_WORKFLOW,
  PROJECTS,
  TASK_WORKFLOW,
  TASKS,
  USERS,
  type WorkflowSeed,
} from './data'
import { LOCAL, type Doc, type SeedPayload } from './payload'

type Data = Record<string, unknown>

/** Created and existing counts per collection, in seed order. */
export type Tally = Map<string, { created: number; existing: number }>

interface UpsertSpec {
  readonly collection: string
  readonly where: Data
  readonly data: () => Data
}

function count(tally: Tally, name: string, existed: boolean): void {
  const { created, existing } = tally.get(name) ?? { created: 0, existing: 0 }
  tally.set(name, existed ? { created, existing: existing + 1 } : { created: created + 1, existing })
}

async function upsert(payload: SeedPayload, spec: UpsertSpec, tally: Tally): Promise<Doc> {
  const { docs } = await payload.find({ ...LOCAL, collection: spec.collection, where: spec.where, limit: 1 })
  const found = docs[0]
  count(tally, spec.collection, found !== undefined)
  return found ?? payload.create({ ...LOCAL, collection: spec.collection, data: spec.data() })
}

const equals = (value: string): Data => ({ equals: value })

async function seedSettings(payload: SeedPayload, tally: Tally): Promise<void> {
  const current = await payload.findGlobal({ ...LOCAL, slug: SETTINGS_GLOBAL })
  const matches = current['appName'] === APP_SETTINGS.appName && current['timezone'] === APP_SETTINGS.timezone
  count(tally, SETTINGS_GLOBAL, matches)
  if (!matches) await payload.updateGlobal({ ...LOCAL, slug: SETTINGS_GLOBAL, data: { ...APP_SETTINGS } })
}

async function seedGroups(payload: SeedPayload, tally: Tally): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const name of GROUPS) {
    const spec = { collection: COLLECTIONS.groups, where: { name: equals(name) }, data: () => ({ name }) }
    ids.set(name, (await upsert(payload, spec, tally)).id)
  }
  return ids
}

async function seedUsers(payload: SeedPayload, groups: IdMap, tally: Tally): Promise<IdMap> {
  const users = new Map<string, string>()
  for (const seed of USERS) {
    const data = (): Data => userData(seed, { users, groups })
    const doc = await upsert(
      payload,
      { collection: COLLECTIONS.users, where: { email: equals(seed.email) }, data },
      tally,
    )
    users.set(seed.key, doc.id)
  }
  return users
}

async function seedWorkflow(payload: SeedPayload, seed: WorkflowSeed, tally: Tally): Promise<WorkflowRef> {
  const where = { and: [{ recordType: equals(seed.recordType) }, { name: equals(seed.name) }] }
  const data = (): Data => workflowData(seed, () => crypto.randomUUID())
  const doc = await upsert(payload, { collection: COLLECTIONS.workflows, where, data }, tally)
  return { id: doc.id, stageIds: stageIdsOf(doc) }
}

async function seedOrganization(payload: SeedPayload, users: IdMap, tally: Tally): Promise<string> {
  const data = (): Data => ({ ...ORGANIZATION, owner: idOf(users, 'manager') })
  const where = { name: equals(ORGANIZATION.name) }
  return (await upsert(payload, { collection: COLLECTIONS.organizations, where, data }, tally)).id
}

async function seedProjects(
  payload: SeedPayload,
  context: RecordContext & { readonly organization: string },
  tally: Tally,
): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const seed of PROJECTS) {
    const data = (): Data => projectData(seed, context)
    const doc = await upsert(
      payload,
      { collection: COLLECTIONS.projects, where: { name: equals(seed.name) }, data },
      tally,
    )
    ids.set(seed.name, doc.id)
  }
  return ids
}

async function seedTasks(
  payload: SeedPayload,
  context: RecordContext & { readonly groups: IdMap; readonly projects: IdMap },
  tally: Tally,
): Promise<void> {
  for (const [index, seed] of TASKS.entries()) {
    const data = (): Data => taskData(seed, index, context)
    await upsert(payload, { collection: COLLECTIONS.tasks, where: { title: equals(seed.title) }, data }, tally)
  }
}

/** Upserts the whole development data set in dependency order and returns the counts. */
export async function seedAll(payload: SeedPayload, now: number): Promise<Tally> {
  const tally: Tally = new Map()
  await seedSettings(payload, tally)
  const groups = await seedGroups(payload, tally)
  const users = await seedUsers(payload, groups, tally)
  const taskWorkflow = await seedWorkflow(payload, TASK_WORKFLOW, tally)
  const projectWorkflow = await seedWorkflow(payload, PROJECT_WORKFLOW, tally)
  const organization = await seedOrganization(payload, users, tally)
  const projects = await seedProjects(payload, { now, users, workflow: projectWorkflow, organization }, tally)
  await seedTasks(payload, { now, users, workflow: taskWorkflow, groups, projects }, tally)
  return tally
}

/** One line with the created and existing counts per collection. */
export function summaryLine(tally: Tally): string {
  const parts = [...tally].map(([name, { created, existing }]) => `${name} ${String(created)}/${String(existing)}`)
  return `seed:dev created/existing: ${parts.join(', ')}`
}

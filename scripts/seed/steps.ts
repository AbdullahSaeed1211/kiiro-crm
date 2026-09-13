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
import { CRM_WORKFLOWS } from './crm-data'
import {
  APP_SETTINGS,
  GROUPS,
  PROJECT_WORKFLOW,
  PROJECTS,
  TASK_WORKFLOW,
  TASKS,
  USERS,
  type WorkflowSeed,
} from './data'
import { seedCrm } from './crm-steps'
import { type Data, equals, type Tally, upsert } from './common'
import { LOCAL, type SeedPayload } from './payload'

/** Created and existing counts per collection. */
export type { Tally } from './common'

async function seedSettings(payload: SeedPayload, tally: Tally): Promise<void> {
  const current = await payload.findGlobal({ ...LOCAL, slug: SETTINGS_GLOBAL })
  const matches = current['appName'] === APP_SETTINGS.appName && current['timezone'] === APP_SETTINGS.timezone
  tally.set(SETTINGS_GLOBAL, matches ? { created: 0, existing: 1 } : { created: 1, existing: 0 })
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

async function seedWork(
  payload: SeedPayload,
  input: {
    readonly now: number
    readonly users: IdMap
    readonly taskWorkflow: WorkflowRef
    readonly projectWorkflow: WorkflowRef
    readonly organization: string
    readonly groups: IdMap
    readonly tally: Tally
  },
): Promise<void> {
  const projects = await seedProjects(
    payload,
    { now: input.now, users: input.users, workflow: input.projectWorkflow, organization: input.organization },
    input.tally,
  )
  await seedTasks(
    payload,
    { now: input.now, users: input.users, workflow: input.taskWorkflow, groups: input.groups, projects },
    input.tally,
  )
}

/** Upserts the complete local development data set in dependency order. */
export async function seedAll(payload: SeedPayload, now: number): Promise<Tally> {
  const tally: Tally = new Map()
  await seedSettings(payload, tally)
  const groups = await seedGroups(payload, tally)
  const users = await seedUsers(payload, groups, tally)
  const taskWorkflow = await seedWorkflow(payload, TASK_WORKFLOW, tally)
  const projectWorkflow = await seedWorkflow(payload, PROJECT_WORKFLOW, tally)
  const [leadSeed, dealSeed] = CRM_WORKFLOWS
  if (leadSeed === undefined || dealSeed === undefined) throw new Error('CRM workflows are incomplete')
  const leadWorkflow = await seedWorkflow(payload, leadSeed, tally)
  const dealWorkflow = await seedWorkflow(payload, dealSeed, tally)
  const organizations = await seedCrm(payload, { now, users, leadWorkflow, dealWorkflow, tally })
  await seedWork(payload, {
    now,
    users,
    taskWorkflow,
    projectWorkflow,
    organization: idOf(organizations, 'example'),
    groups,
    tally,
  })
  return tally
}

/** One line with the created and existing counts per collection. */
export function summaryLine(tally: Tally): string {
  const parts = [...tally].map(([name, { created, existing }]) => `${name} ${String(created)}/${String(existing)}`)
  return `seed:dev created/existing: ${parts.join(', ')}`
}

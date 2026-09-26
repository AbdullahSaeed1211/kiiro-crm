/* eslint-disable complexity -- the deterministic seed keeps dependency ordering explicit. */
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
import { removeLegacyPlaceholderRecords } from './cleanup'
import { APP_SETTINGS, GROUPS, PROJECT_WORKFLOW, TASK_WORKFLOW, USERS, type WorkflowSeed } from './data'
import { PROJECTS, TASKS } from './work-data'
import { seedCrm } from './crm-steps'
import { type Data, equals, type Tally, upsert } from './common'
import { LOCAL, type SeedPayload } from './payload'

/** Created and existing counts per collection. */
export type { Tally } from './common'

async function seedSettings(payload: SeedPayload, tally: Tally): Promise<void> {
  const current = await payload.findGlobal({ ...LOCAL, slug: SETTINGS_GLOBAL })
  const currentBrand =
    typeof current['brand'] === 'object' && current['brand'] !== null
      ? (current['brand'] as Record<string, unknown>)
      : {}
  const currentEmail =
    typeof current['email'] === 'object' && current['email'] !== null
      ? (current['email'] as Record<string, unknown>)
      : {}
  const matches =
    current['appName'] === APP_SETTINGS.appName &&
    current['timezone'] === APP_SETTINGS.timezone &&
    current['locale'] === APP_SETTINGS.locale &&
    current['currency'] === APP_SETTINGS.currency &&
    currentBrand['primaryHex'] === APP_SETTINGS.brand.primaryHex &&
    currentEmail['fromName'] === APP_SETTINGS.email.fromName &&
    currentEmail['fromAddress'] === APP_SETTINGS.email.fromAddress &&
    currentEmail['inboundDomain'] === APP_SETTINGS.email.inboundDomain
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

async function migrateLegacyOwnerEmail(payload: SeedPayload, ownerEmail: string): Promise<void> {
  const legacy = await payload.find({
    ...LOCAL,
    collection: COLLECTIONS.users,
    where: { email: equals('mirchads@example.test') },
    limit: 1,
  })
  if (legacy.docs[0] !== undefined) {
    const current = await payload.find({
      ...LOCAL,
      collection: COLLECTIONS.users,
      where: { email: equals(ownerEmail) },
      limit: 1,
    })
    if (current.docs[0] === undefined)
      await payload.update({
        ...LOCAL,
        collection: COLLECTIONS.users,
        id: legacy.docs[0].id,
        data: { email: ownerEmail, name: 'Owner' },
      })
  }
}

async function upsertUser(
  payload: SeedPayload,
  seed: (typeof USERS)[number],
  input: { readonly groups: IdMap; users: Map<string, string>; readonly tally: Tally },
): Promise<void> {
  const data = (): Data => userData(seed, { users: input.users, groups: input.groups })
  const doc = await upsert(
    payload,
    { collection: COLLECTIONS.users, where: { email: equals(seed.email) }, data },
    input.tally,
  )
  if (doc['name'] !== seed.name)
    await payload.update({
      ...LOCAL,
      collection: COLLECTIONS.users,
      id: doc.id,
      data: { name: seed.name },
      overrideAccess: true,
    })
  input.users.set(seed.key, doc.id)
}

async function seedUsers(payload: SeedPayload, groups: IdMap, tally: Tally): Promise<IdMap> {
  const users = new Map<string, string>()
  const input = { groups, users, tally }
  for (const seed of USERS) {
    if (seed.key === 'owner' && seed.email === 'mirchads@gmail.com') {
      await migrateLegacyOwnerEmail(payload, seed.email)
    }
    await upsertUser(payload, seed, input)
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
  context: RecordContext & { readonly organizations: IdMap },
  tally: Tally,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>()
  for (const seed of PROJECTS) {
    const data = (): Data =>
      projectData(seed, { ...context, organization: idOf(context.organizations, seed.organizationKey) })
    const where =
      seed.previousName === undefined
        ? { name: equals(seed.name) }
        : { or: [{ name: equals(seed.name) }, { name: equals(seed.previousName) }] }
    const doc = await upsert(payload, { collection: COLLECTIONS.projects, where, data }, tally)
    const next = data()
    if (Object.entries(next).some(([key, value]) => JSON.stringify(doc[key]) !== JSON.stringify(value))) {
      await payload.update({ ...LOCAL, collection: COLLECTIONS.projects, id: doc.id, data: next })
    }
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
    const where =
      seed.previousTitle === undefined
        ? { title: equals(seed.title) }
        : { or: [{ title: equals(seed.title) }, { title: equals(seed.previousTitle) }] }
    const doc = await upsert(payload, { collection: COLLECTIONS.tasks, where, data }, tally)
    const next = data()
    if (Object.entries(next).some(([key, value]) => JSON.stringify(doc[key]) !== JSON.stringify(value))) {
      await payload.update({ ...LOCAL, collection: COLLECTIONS.tasks, id: doc.id, data: next })
    }
  }
}

async function seedWorkflows(
  payload: SeedPayload,
  tally: Tally,
): Promise<{ taskWorkflow: WorkflowRef; projectWorkflow: WorkflowRef }> {
  const taskWorkflow = await seedWorkflow(payload, TASK_WORKFLOW, tally)
  const projectWorkflow = await seedWorkflow(payload, PROJECT_WORKFLOW, tally)
  return { taskWorkflow, projectWorkflow }
}

async function seedCrmWorkflows(
  payload: SeedPayload,
  tally: Tally,
): Promise<{ leadWorkflow: WorkflowRef; dealWorkflow: WorkflowRef }> {
  const [leadSeed, dealSeed] = CRM_WORKFLOWS
  if (leadSeed === undefined || dealSeed === undefined) throw new Error('CRM workflows are incomplete')
  const leadWorkflow = await seedWorkflow(payload, leadSeed, tally)
  const dealWorkflow = await seedWorkflow(payload, dealSeed, tally)
  return { leadWorkflow, dealWorkflow }
}

async function seedWork(
  payload: SeedPayload,
  input: {
    readonly now: number
    readonly users: IdMap
    readonly taskWorkflow: WorkflowRef
    readonly projectWorkflow: WorkflowRef
    readonly organizations: IdMap
    readonly groups: IdMap
    readonly tally: Tally
  },
): Promise<void> {
  const projects = await seedProjects(
    payload,
    { now: input.now, users: input.users, workflow: input.projectWorkflow, organizations: input.organizations },
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
  await removeLegacyPlaceholderRecords(payload)
  await seedSettings(payload, tally)
  const groups = await seedGroups(payload, tally)
  const users = await seedUsers(payload, groups, tally)
  const { taskWorkflow, projectWorkflow } = await seedWorkflows(payload, tally)
  const { leadWorkflow, dealWorkflow } = await seedCrmWorkflows(payload, tally)
  const organizations = await seedCrm(payload, { now, users, leadWorkflow, dealWorkflow, tally })
  await seedWork(payload, {
    now,
    users,
    taskWorkflow,
    projectWorkflow,
    organizations,
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

import { asId, type Id } from '@ops/kernel'
import type { CollectionSlug, Payload, PayloadRequest } from 'payload'
import { expect } from 'vitest'
import { ORGANIZATIONS } from '../../../../../scripts/seed/crm-directory-data'
import { DEV_PASSWORD } from '../../../../../scripts/seed/data'
import { PROJECTS, TASKS } from '../../../../../scripts/seed/work-data'
import { loadReportIds, resolveActor } from '../../src/access/actor'
import { COLLECTIONS, RECORD_TYPES } from '../../src/contracts/names'
import { createTaskRepository } from '../../src/repositories'
import { fieldOf, textOf } from '../../src/repositories/documents'
import { requestAs, SEEDED_EMAILS, userByEmail, type SpikeCase } from './local-stack'

const byName = (a: string, b: string): number => a.localeCompare(b)
const memberProjects = (user: 'staff1' | 'staff2'): string[] =>
  PROJECTS.filter((project) => project.members.includes(user))
    .map((project) => project.name)
    .toSorted(byName)
const visibleTasks = (user: 'staff1' | 'staff2', projectNames: readonly string[]): string[] => {
  const projects = new Set(projectNames)
  return TASKS.filter(
    (task) => task.assignees.includes(user) || (task.project !== undefined && projects.has(task.project)),
  )
    .map((task) => task.title)
    .toSorted(byName)
}
const STAFF1_PROJECTS = memberProjects('staff1')
const STAFF2_PROJECTS = memberProjects('staff2')
const STAFF1_TASKS = visibleTasks('staff1', STAFF1_PROJECTS)
const STAFF2_TASKS = visibleTasks('staff2', STAFF2_PROJECTS)
const REPORT_PROJECT = 'Project owned by an indirect report'

const SEEDED_NAMES = {
  tasks: [...TASKS.map((task) => task.title)].toSorted(byName),
  projects: [...PROJECTS.map((project) => project.name)].toSorted(byName),
  organizations: ORGANIZATIONS.map((organization) => organization.name).toSorted(byName),
}

const nameOf = (doc: object): string => textOf(doc, 'name') ?? textOf(doc, 'title') ?? ''

async function namesAsUser(req: PayloadRequest, collection: CollectionSlug): Promise<string[]> {
  const page = await req.payload.find({
    collection,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return page.docs.map(nameOf).toSorted(byName)
}

async function taskTitlesAs(req: PayloadRequest): Promise<string[]> {
  const tasks = await createTaskRepository(req).listTasks()
  return tasks.map((task) => task.title).toSorted(byName)
}

async function expectUnrestricted(payload: Payload, email: string): Promise<void> {
  const req = await requestAs(payload, email)
  expect(await taskTitlesAs(req)).toEqual(SEEDED_NAMES.tasks)
  expect(await namesAsUser(req, COLLECTIONS.tasks)).toEqual(SEEDED_NAMES.tasks)
  expect(await namesAsUser(req, COLLECTIONS.projects)).toEqual(SEEDED_NAMES.projects)
  expect(await namesAsUser(req, COLLECTIONS.organizations)).toEqual(SEEDED_NAMES.organizations)
}

interface StaffScope {
  readonly tasks: readonly string[]
  readonly projects: readonly string[]
}

async function expectStaffScope(payload: Payload, email: string, expected: StaffScope): Promise<void> {
  const req = await requestAs(payload, email)
  expect(await taskTitlesAs(req)).toEqual(expected.tasks)
  expect(await namesAsUser(req, COLLECTIONS.tasks)).toEqual(expected.tasks)
  expect(await namesAsUser(req, COLLECTIONS.projects)).toEqual(expected.projects)
  // Seeded organizations are owned by the account owner, who reports to nobody.
  expect(await namesAsUser(req, COLLECTIONS.organizations)).toEqual([])
}

async function expectHiddenFromStaff2(payload: Payload): Promise<void> {
  const staff1Only = STAFF1_TASKS.filter((title) => !STAFF2_TASKS.includes(title))
  const where = { title: { in: staff1Only } }
  const { docs } = await payload.find({ collection: COLLECTIONS.tasks, where, pagination: false, overrideAccess: true })
  const req = await requestAs(payload, SEEDED_EMAILS.staff2)
  const tasks = createTaskRepository(req)
  const loaded = await Promise.all(
    docs.map((doc) => tasks.loadRecord({ type: RECORD_TYPES.tasks, id: asId(String(doc.id)) })),
  )
  expect(docs).toHaveLength(staff1Only.length)
  // `loadRecord` is the read behind board and timeline writes, so these tasks cannot be changed either.
  expect(loaded.filter((record) => record !== undefined)).toEqual([])
  expect((await taskTitlesAs(req)).filter((title) => staff1Only.includes(title))).toEqual([])
}

async function userId(payload: Payload, email: string): Promise<Id> {
  return asId(String((await userByEmail(payload, email)).id))
}

async function expectSeededReports(payload: Payload): Promise<void> {
  const manager = await requestAs(payload, SEEDED_EMAILS.manager)
  const staff1Id = await userId(payload, SEEDED_EMAILS.staff1)
  const staff2Id = await userId(payload, SEEDED_EMAILS.staff2)
  const managerReports = await loadReportIds(manager, await userId(payload, SEEDED_EMAILS.manager))
  expect(managerReports.toSorted(byName)).toEqual([staff1Id, staff2Id].toSorted(byName))
  expect(await loadReportIds(manager, staff1Id)).toEqual([])
  // Managers read everything, so report ids are loaded for staff actors only.
  expect(await resolveActor(manager)).toMatchObject({ role: 'manager', active: true, reportIds: [] })
  expect(await resolveActor(await requestAs(payload, SEEDED_EMAILS.staff1))).toMatchObject({ reportIds: [] })
}

async function createReport(payload: Payload, name: string, reportsTo: Id): Promise<Id> {
  const data = { email: `${name}@example.test`, name, role: 'staff', password: DEV_PASSWORD, reportsTo }
  const doc = await payload.create({
    collection: COLLECTIONS.users,
    data,
    depth: 0,
    overrideAccess: true,
    context: { authOperation: 'provisioning' },
  })
  return asId(String(doc.id))
}

async function addIndirectReportProject(payload: Payload): Promise<void> {
  const direct = await createReport(payload, 'spike-report', await userId(payload, SEEDED_EMAILS.staff1))
  const indirect = await createReport(payload, 'spike-indirect-report', direct)
  const { docs } = await payload.find({ collection: COLLECTIONS.projects, limit: 1, depth: 0, overrideAccess: true })
  const [template] = docs
  if (template === undefined) throw new Error('no seeded project')
  const stage = { workflow: fieldOf(template, 'workflow'), stageId: fieldOf(template, 'stageId') }
  const data = { name: REPORT_PROJECT, owner: indirect, members: [], ...stage }
  await payload.create({ collection: COLLECTIONS.projects, data, depth: 0, overrideAccess: true })
}

async function expectIndirectReportScope(payload: Payload): Promise<void> {
  await addIndirectReportProject(payload)
  const staff1 = await requestAs(payload, SEEDED_EMAILS.staff1)
  expect((await resolveActor(staff1))?.reportIds).toHaveLength(2)
  expect(await namesAsUser(staff1, COLLECTIONS.projects)).toEqual([REPORT_PROJECT, ...STAFF1_PROJECTS].toSorted(byName))
  expect(await namesAsUser(await requestAs(payload, SEEDED_EMAILS.staff2), COLLECTIONS.projects)).toEqual(
    STAFF2_PROJECTS.toSorted(byName),
  )
}

/** Staff scope per role (spec §9.10, §11.1) through the Payload access functions and the task repository. */
export const SCOPE_CASES: readonly SpikeCase[] = [
  [
    'owner reads every seeded task, project and organization',
    (s) => expectUnrestricted(s.payload, SEEDED_EMAILS.owner),
  ],
  [
    'manager reads every seeded task, project and organization',
    (s) => expectUnrestricted(s.payload, SEEDED_EMAILS.manager),
  ],
  [
    'staff1 reads assigned, group and member-project tasks plus member projects',
    (s) => expectStaffScope(s.payload, SEEDED_EMAILS.staff1, { tasks: STAFF1_TASKS, projects: STAFF1_PROJECTS }),
  ],
  [
    'staff2 reads assigned and member-project tasks and projects',
    (s) => expectStaffScope(s.payload, SEEDED_EMAILS.staff2, { tasks: STAFF2_TASKS, projects: STAFF2_PROJECTS }),
  ],
  ['staff2 neither lists nor loads the tasks only staff1 may see', (s) => expectHiddenFromStaff2(s.payload)],
  ['loadReportIds follows seeded reportsTo; manager actors carry no report ids', (s) => expectSeededReports(s.payload)],
  [
    'staff read projects owned by an indirect report (depth 2); peers do not',
    (s) => expectIndirectReportScope(s.payload),
  ],
]

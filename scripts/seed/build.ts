import { APP_SETTINGS, DEV_PASSWORD, type UserSeed, type WorkflowSeed } from './data'
import type { ProjectSeed, TaskSeed } from './work-data'
import type { ContactSeed, DealSeed, LeadSeed, OrganizationSeed } from './crm-types'

type Data = Record<string, unknown>

/** One day in milliseconds. */
export const DAY_MS = 86_400_000

/** Ids of stored documents keyed by seed key or name. */
export type IdMap = ReadonlyMap<string, string>

/** A stored workflow and its stage ids keyed by stage name. */
export interface WorkflowRef {
  readonly id: string
  readonly stageIds: IdMap
}

/** Stored ids a task or project refers to, plus the seed clock. */
export interface RecordContext {
  readonly now: number
  readonly users: IdMap
  readonly workflow: WorkflowRef
}

/** Id of `key`; throws when the seed refers to something that was not stored. */
export function idOf(ids: IdMap, key: string): string {
  const id = ids.get(key)
  if (id === undefined) throw new Error(`seed refers to unknown "${key}"`)
  return id
}

const optionalId = (ids: IdMap, key: string | undefined): string | null => (key === undefined ? null : idOf(ids, key))

/** Fixed-width rank, so seeded records sort in seed order. */
export function rankAt(index: number): string {
  return String(index + 1).padStart(4, '0')
}

/** Workflow document with a new id per stage; the first stage is the default. */
export function workflowData(seed: WorkflowSeed, newId: () => string): Data {
  const stages = seed.stages.map((stage, position) => ({ id: newId(), ...stage, position }))
  return { recordType: seed.recordType, name: seed.name, stages, defaultStageId: stages[0]?.id }
}

const stageEntry = (row: unknown): [string, string][] => {
  if (typeof row !== 'object' || row === null) return []
  const { id, name } = row as { readonly id?: unknown; readonly name?: unknown }
  return typeof id === 'string' && typeof name === 'string' ? [[name, id]] : []
}

/** Stage ids of a stored workflow keyed by stage name. */
export function stageIdsOf(workflow: Readonly<Data>): Map<string, string> {
  const stages: unknown = workflow['stages']
  return new Map(Array.isArray(stages) ? (stages as readonly unknown[]).flatMap(stageEntry) : [])
}

/** User document; `users` must already hold the user it reports to. */
export function userData(seed: UserSeed, ids: { readonly users: IdMap; readonly groups: IdMap }): Data {
  const { email, name, role } = seed
  const groups = seed.group === undefined ? [] : [idOf(ids.groups, seed.group)]
  return { email, name, role, password: DEV_PASSWORD, groups, reportsTo: optionalId(ids.users, seed.reportsTo) }
}

const stageData = (context: RecordContext, stage: string): Data => ({
  workflow: context.workflow.id,
  stageId: idOf(context.workflow.stageIds, stage),
  stageEnteredAt: context.now,
})

/** Returns a UTC epoch offset from the seed clock. */
export const atDay = (now: number, day: number): number => now + day * DAY_MS

/** Project document owned by the account owner inside `organization`. */
export function projectData(seed: ProjectSeed, context: RecordContext & { readonly organization: string }): Data {
  return {
    name: seed.name,
    description: seed.description,
    organization: context.organization,
    owner: idOf(context.users, 'owner'),
    members: seed.members.map((key) => idOf(context.users, key)),
    ...stageData(context, seed.stage),
    startAt: atDay(context.now, seed.startDay),
    targetEndAt: atDay(context.now, seed.targetEndDay),
  }
}

/** Task document at board position `index`. */
export function taskData(
  seed: TaskSeed,
  index: number,
  context: RecordContext & { readonly groups: IdMap; readonly projects: IdMap },
): Data {
  return {
    title: seed.title,
    description: seed.description,
    ...stageData(context, seed.stage),
    priority: seed.priority,
    assignees: seed.assignees.map((key) => idOf(context.users, key)),
    group: optionalId(context.groups, seed.group),
    project: optionalId(context.projects, seed.project),
    startAt: atDay(context.now, seed.startDay),
    dueAt: atDay(context.now, seed.dueDay),
    rank: rankAt(index),
  }
}

/** Organization document with an optional lead source. */
export function organizationData(seed: OrganizationSeed, users: IdMap, sources: IdMap): Data {
  return {
    name: seed.name,
    website: seed.website,
    phone: seed.phone,
    email: seed.email,
    owner: idOf(users, 'owner'),
    source: seed.source === undefined ? null : idOf(sources, seed.source),
    customData: {},
  }
}

/** Contact document linked to a seeded organization and manager. */
export function contactData(seed: ContactSeed, organizations: IdMap, users: IdMap): Data {
  return {
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: seed.email,
    phone: seed.phone,
    organization: idOf(organizations, seed.organization),
    owner: idOf(users, 'manager'),
    customData: {},
  }
}

/** Lead document; convertedDeal is filled in during the relationship pass. */
export function leadData(
  seed: LeadSeed,
  context: RecordContext & { readonly organizations: IdMap; readonly sources: IdMap; readonly lostReasons: IdMap },
): Data {
  return {
    title: seed.title,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: seed.email,
    phone: seed.phone,
    companyName: seed.companyName,
    organization: idOf(context.organizations, seed.organization),
    source: idOf(context.sources, seed.source),
    owner: idOf(context.users, seed.owner),
    assignees: seed.assignees.map((key) => idOf(context.users, key)),
    ...stageData(context, seed.stage),
    lostReason: seed.lostReason === undefined ? null : idOf(context.lostReasons, seed.lostReason),
    lostNote: seed.lostNote ?? null,
    convertedAt: seed.stage === 'Converted' ? atDay(context.now, -1) : null,
    convertedDeal: null,
    customData: { service: seed.service, budget: seed.budget },
  }
}

/** Deal document linked to organizations, contacts, users and an optional source lead. */
export function dealData(
  seed: DealSeed,
  context: RecordContext & {
    readonly organizations: IdMap
    readonly contacts: IdMap
    readonly leads: IdMap
    readonly lostReasons: IdMap
  },
): Data {
  const terminal = seed.stage === 'Won' || seed.stage === 'Lost'
  return {
    title: seed.title,
    organization: idOf(context.organizations, seed.organization),
    contacts: seed.contacts.map((key) => idOf(context.contacts, key)),
    primaryContact: idOf(context.contacts, seed.primaryContact),
    valueAmountMinor: seed.valueAmountMinor,
    valueCurrency: APP_SETTINGS.currency,
    expectedCloseAt: atDay(context.now, seed.expectedCloseDay),
    closedAt: terminal ? atDay(context.now, seed.expectedCloseDay) : null,
    owner: idOf(context.users, seed.owner),
    assignees: seed.assignees.map((key) => idOf(context.users, key)),
    ...stageData(context, seed.stage),
    sourceLead: seed.sourceLead === undefined ? null : idOf(context.leads, seed.sourceLead),
    lostReason: seed.lostReason === undefined ? null : idOf(context.lostReasons, seed.lostReason),
    lostNote: seed.lostNote ?? null,
    customData: { serviceLines: [...seed.serviceLines] },
  }
}

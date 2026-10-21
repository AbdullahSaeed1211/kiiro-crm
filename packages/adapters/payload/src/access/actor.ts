import { asId, type Id } from '@ops/kernel'
import type { Actor, Role, WorkProfile } from '@ops/platform'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../contracts/names'

const ROLES: ReadonlySet<string> = new Set(['owner', 'manager', 'staff'])
const WORK_PROFILES: ReadonlySet<string> = new Set(['sales', 'delivery', 'consultant'])
const PROFILE_ACCESS: Readonly<
  Record<
    WorkProfile,
    Readonly<{ records: readonly string[]; unlinked: readonly string[]; related?: readonly string[] }>
  >
> = {
  sales: {
    records: [
      RECORD_TYPES.organizations,
      RECORD_TYPES.contacts,
      RECORD_TYPES.leads,
      RECORD_TYPES.deals,
      RECORD_TYPES.tasks,
    ],
    unlinked: [RECORD_TYPES.tasks],
    related: [RECORD_TYPES.leads, RECORD_TYPES.contacts, RECORD_TYPES.deals],
  },
  delivery: {
    records: [RECORD_TYPES.organizations, RECORD_TYPES.contacts, RECORD_TYPES.projects, RECORD_TYPES.tasks],
    unlinked: [],
  },
  consultant: {
    records: [RECORD_TYPES.organizations, RECORD_TYPES.contacts, RECORD_TYPES.projects, RECORD_TYPES.tasks],
    unlinked: [],
  },
}
const MAX_REPORT_DEPTH = 5
const actors = new WeakMap<PayloadRequest, Promise<Actor | undefined>>()

function roleOf(user: object): { readonly role: Role; readonly known: boolean } {
  const roleValue = read(user, FIELDS.role)
  const known = typeof roleValue === 'string' && ROLES.has(roleValue)
  return { role: known ? (roleValue as Role) : 'staff', known }
}

function workProfileOf(user: object): WorkProfile {
  const value = read(user, 'workProfile')
  return typeof value === 'string' && WORK_PROFILES.has(value) ? (value as WorkProfile) : 'delivery'
}

function profilePermissions(role: Role, profile: WorkProfile) {
  const value = role === 'staff' ? PROFILE_ACCESS[profile] : undefined
  if (value === undefined) return {}
  return {
    recordTypes: value.records,
    unlinkedRecordTypes: value.unlinked,
    ...(value.related === undefined ? {} : { relatedRecordTypes: value.related }),
  }
}

// Documents are read by key because the generated user type differs per app.
function read(doc: object, key: string): unknown {
  return (doc as Readonly<Record<string, unknown>>)[key]
}

function idOf(value: unknown): Id | undefined {
  if (typeof value === 'string' || typeof value === 'number') return asId(String(value))
  if (typeof value === 'object' && value !== null && 'id' in value) return idOf(value.id)
  return undefined
}

function idsOf(value: unknown): Id[] {
  if (!Array.isArray(value)) return []
  return value.map(idOf).filter((id): id is Id => id !== undefined)
}

/** Maps a users document to an actor; a missing or unknown role yields an inactive staff actor. */
export function toActor(user: object, reportIds: readonly Id[] = []): Actor | undefined {
  const id = idOf(read(user, 'id'))
  if (id === undefined) return undefined
  const { role, known } = roleOf(user)
  const workProfile = workProfileOf(user)
  const active = known && read(user, FIELDS.active) === true
  return {
    id,
    role,
    active,
    workProfile,
    ...profilePermissions(role, workProfile),
    groupIds: idsOf(read(user, FIELDS.groups)),
    reportIds,
  }
}

/** Ids of users reporting to `managerId` directly or indirectly, up to five levels (spec §9.10). */
export async function loadReportIds(req: PayloadRequest, managerId: Id): Promise<Id[]> {
  const found = new Set<Id>()
  let frontier: Id[] = [managerId]
  for (let depth = 0; depth < MAX_REPORT_DEPTH && frontier.length > 0; depth += 1) {
    const where = { [FIELDS.reportsTo]: { in: frontier } }
    const page = await req.payload.find({ collection: COLLECTIONS.users, where, depth: 0, pagination: false, req })
    frontier = idsOf(page.docs).filter((id) => id !== managerId && !found.has(id))
    frontier.forEach((id) => found.add(id))
  }
  return [...found]
}

async function loadActor(req: PayloadRequest): Promise<Actor | undefined> {
  if (req.user === null) return undefined
  const base = toActor(req.user)
  if (base?.role !== 'staff' || !base.active) return base
  return { ...base, reportIds: await loadReportIds(req, base.id) }
}

/** The actor of an authenticated request; staff reports are loaded once per request. */
export function resolveActor(req: PayloadRequest): Promise<Actor | undefined> {
  const cached = actors.get(req)
  if (cached !== undefined) return cached
  const pending = loadActor(req)
  actors.set(req, pending)
  return pending
}

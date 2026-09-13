import { asId, type Id } from '@ops/kernel'
import type { Actor, Role } from '@ops/platform'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS, FIELDS } from '../contracts/names'

type UserDocument = Readonly<Record<string, unknown>>

const ROLES: ReadonlySet<string> = new Set(['owner', 'manager', 'staff'])
const MAX_REPORT_DEPTH = 5
const actors = new WeakMap<PayloadRequest, Promise<Actor | undefined>>()

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
export function toActor(user: UserDocument, reportIds: readonly Id[] = []): Actor | undefined {
  const id = idOf(user['id'])
  if (id === undefined) return undefined
  const roleValue = user[FIELDS.role]
  const known = typeof roleValue === 'string' && ROLES.has(roleValue)
  const role = known ? (roleValue as Role) : 'staff'
  return { id, role, active: known && user[FIELDS.active] === true, groupIds: idsOf(user[FIELDS.groups]), reportIds }
}

/** Loads the ids of users who report to `managerId` directly or indirectly, up to five levels (spec §9.10). */
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

/** Returns the actor of an authenticated request, loading transitive reports for staff once per request. */
export function resolveActor(req: PayloadRequest): Promise<Actor | undefined> {
  const cached = actors.get(req)
  if (cached !== undefined) return cached
  const pending = loadActor(req)
  actors.set(req, pending)
  return pending
}

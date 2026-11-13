import { createPresenceRepository } from '@ops/adapter-payload'
import { isManagerUp } from '@ops/platform'
import type { RequestContext } from '@/server/container'
import type { DashboardPresence } from './dashboard-model'

const ACTIVE_WINDOW_MS = 2 * 60_000
const RECENT_WINDOW_MS = 15 * 60_000

async function activeRoster(context: RequestContext) {
  if (!isManagerUp(context.actor)) return []
  const result = await context.payload.find({
    collection: 'users',
    where: { active: { equals: true } },
    sort: ['name', 'id'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req: context.req,
    select: { id: true, name: true },
  })
  return result.docs.map((person) => ({ id: person.id, name: person.name }))
}

/** Owner and manager dashboards show a coarse signal for active users in this isolated tenant. */
export async function loadDashboardPresence(context: RequestContext): Promise<readonly DashboardPresence[]> {
  if (!isManagerUp(context.actor)) return []
  const roster = await activeRoster(context)
  const names = new Map(roster.map((person) => [person.id, person.name]))
  const rows = await createPresenceRepository(context.req).list(roster.map((person) => person.id))
  const now = Date.now()
  const visible: DashboardPresence[] = []
  for (const row of rows) {
    const age = now - row.lastSeenAt
    const personName = names.get(row.userId)
    if (personName === undefined || age < 0 || age > RECENT_WINDOW_MS) continue
    visible.push({
      userId: row.userId,
      personName,
      lastSeenAt: row.lastSeenAt,
      state: age <= ACTIVE_WINDOW_MS ? 'active' : 'recent',
    })
  }
  return visible.sort((left, right) => {
    if (left.state !== right.state) return left.state === 'active' ? -1 : 1
    return left.personName.localeCompare(right.personName)
  })
}

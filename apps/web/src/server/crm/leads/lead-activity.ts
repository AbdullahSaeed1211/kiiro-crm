import type { Activity } from '../../../payload-types'
import type { LeadActivityItem, LeadPerson } from './types'
import { initials } from '@ops/ui/lib/initials'

function activityActor(row: Activity, people: ReadonlyMap<string, LeadPerson>): LeadPerson | null {
  if (typeof row.actor !== 'string') return null
  return people.get(row.actor) ?? null
}

function activityData(value: Activity['data']): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value
}

export function activityItem(row: Activity, people: ReadonlyMap<string, LeadPerson>): LeadActivityItem {
  const actor = activityActor(row, people)
  const data = activityData(row.data)
  const actorName = actor?.name ?? null
  const actorInitials = actor === null ? null : initials(actor.name)
  return { id: row.id, occurredAt: row.occurredAt, actorName, actorInitials, verb: row.verb, data }
}
